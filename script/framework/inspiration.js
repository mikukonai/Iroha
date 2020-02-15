
// Framework IROHA V4.0
// mikukonai.com
// Copyright © 2016-2019 Mikukonai

function LoadInspirations() {

    let posters, html;

    ////////////////////////////////////////////////////////
    //  以 下 是 Poster 解 析 / 渲 染 器
    ////////////////////////////////////////////////////////

    function Escape(input) {
        return input.replace(/\\(?!\\)[#]/g, '@S^').replace(/\\(?!\\)[\[]/g, '@L^')
            .replace(/\\(?!\\)[\]]/g, '@R^').replace(/\\(?!\\)[\(]/g, '@A^')
            .replace(/\\(?!\\)[\)]/g, '@B^').replace(/\\(?!\\)[;]/g, '@C^');
    }

    function Unescape(input) {
        return input.replace(/@S\^/g, '#').replace(/@L\^/g, '[')
            .replace(/@R\^/g, ']').replace(/@A\^/g, '(')
            .replace(/@B\^/g, ')').replace(/@C\^/g, ';');
    }

    function Poster() {
        this.id = 0;
        this.title = "";
        this.date = "2016-11-24";
        this.imageURL = "";
        this.content = "";
        this.tags = new Array();
    }

    function ParsePosters(script) {
        let posters = new Array();

        // 转义字符替换
        script = Escape(script);

        // 分节
        let sections = script.split(/\n+={5,}\n+/);
        for(let i = 0; i < sections.length; i++) {
            let section = sections[i].trim();

            let poster = new Poster();
            poster.id = i;

            let contentBuffer = new Array();
            // 分行
            let lines = section.split(/[\n\r]/gi);
            for(let j = 0; j < lines.length; j++) {
                let line = lines[j].trim();
                if(/^\@title\:/gi.test(line) === true) {
                    let title = line.substring(`@title:`.length).trim();
                    poster.title = title;
                }
                else if(/^\@date\:/gi.test(line) === true) {
                    let date = line.substring(`@date:`.length).trim();
                    poster.date = date;
                }
                else if(/^\@imageURL\:/gi.test(line) === true) {
                    let imageURL = line.substring(`@imageURL:`.length).trim();
                    poster.imageURL = imageURL;
                }
                else {
                    contentBuffer.push(line);
                }
            }
            let contentScript = contentBuffer.join('\n');
            // 将contentScript解析为HTML
            let contentObject = ParseContent(contentScript);
            poster.content = contentObject.HTML;
            poster.tags = contentObject.tags;
            posters.push(poster);
        }
        return posters;
    }
    
    function RenderPosters(posters) {
        let AllHtmlBuffer = new Array();
        for(let index = 0; index < posters.length; index++) {
            let poster = posters[index];
            let HtmlBuffer = new Array();
            // 头像
            HtmlBuffer.push(`<img src="${DEFAULT_POSTER_AVATAR}" class="PosterAvater">`);
            // 标题
            HtmlBuffer.push(`<div class="PosterTitle">${poster.title}</div>`);
            // 日期（或者副标题）
            HtmlBuffer.push(`<div class="PosterSubtitle">${poster.date}</div>`);
            // 正文(超过400字符即折叠，避免时间线过长)
            let content = poster.content;
            if(content.length > 400) {
                HtmlBuffer.push(`<div id="pst_${poster.id}" style="height:100px;overflow: hidden; margin-top: -8px;">${content}</div><div id="mask_${poster.id}" style="margin-top: -120px; padding: 120px 0 10px 0; position: relative; height:20px; background: linear-gradient(0deg, rgba(255,255,255,1.0),rgba(255,255,255,0.0)); text-align: center; line-height: 20px; font-weight: bold; color: #b395f0; font-size: 15px;" onclick="$('#pst_${poster.id}').css('height', '100%');$('#mask_${poster.id}').hide();">▼ 展 开 全 文</div>`);
            }
            else {
                HtmlBuffer.push(content);
            }
            // 图片
            if(poster.imageURL.length > 0) {
                HtmlBuffer.push(`<p class="PosterParagraph"><a class="PosterLink" href="${poster.imageURL}"><img id="IMG_${poster.id}" src="${poster.imageURL}" style="max-width:80%;max-height:300px;" class="poster-attachment"></a></p>`);
            }
            AllHtmlBuffer.push(`<div id="Poster_${poster.id}" class="Poster">${HtmlBuffer.join("")}</div>`);
        }
        let HTML = Unescape(AllHtmlBuffer.join(""));
        return HTML;
    }

    function ParseContent(contentScript) {
        let tags = new Array();
        let HtmlBuffer = new Array();
        // 分段
        contentScript.trim().split(/\n{2,}/).forEach((paragraph, index) => {
            HtmlBuffer.push(`<p class="PosterParagraph">`);
            // 分行
            paragraph.split(/\n{1}/).forEach((line, index, lines) => {
                // 处理话题标签
                line.split(/#{1}/).forEach((slice, index, slices) => {
                    // 偶数段为标签外文本
                    if(index % 2 == 0 || slices.length-1 == index) {
                        // 处理超链接
                        slice.split(/\[/).forEach((link_remain, index, remains) => {
                            // 取首次（当然不支持嵌套括号）出现的右括号位置下标
                            let right_bracket = link_remain.search(/\]/);
                            // 没有左括号，视为没有链接
                            if(remains.length == 1) {
                                HtmlBuffer.push(link_remain);
                            }
                            // 如果没有发现右括号，说明是链接前的部分，原样输出
                            else if(right_bracket < 0) {
                                HtmlBuffer.push(link_remain);
                            }
                            else {
                                let urlstr = '';
                                let hasurl = false;
                                // 检查是否有链接字段
                                if(/\]\(.*\)/.test(link_remain)) {
                                    hasurl = true;
                                    urlstr = link_remain.match(/\]\(.*\)/g)[0]; // 最大匹配范围，因而不可嵌套或并列
                                    urlstr = urlstr.substring(2, urlstr.length-1);
                                }
                                
                                let link = link_remain.substring(0,right_bracket);
                                if(urlstr != '') {
                                    HtmlBuffer.push(`<a class="PosterLink" href="${urlstr}">${link}</a>`);
                                }
                                else {
                                    HtmlBuffer.push(`<a class="PosterLink" href="${link}">${link}</a>`);
                                }
                                let remnent = link_remain.substring(right_bracket+1);
                                if(hasurl == true) {
                                    let r_index = remnent.search(/\)[^\)]*$/);
                                    remnent = remnent.substring(r_index + 1);
                                }
                                HtmlBuffer.push(remnent);
                            }
                        });
                    }
                    // 标签内文本套上a输出
                    else {
                        HtmlBuffer.push(` <a class="PosterLink PosterTag" href="javascript:topic('${slice}');" data-tag="${slice}">#${slice}#</a> `);
                        tags.push(slice);
                    }
                });
                if(!(lines.length == 1 || index == lines.length-1)) {
                    HtmlBuffer.push(`<br/>`);
                }
            });
            HtmlBuffer.push(`</p>`);
        });
        return {
            HTML: HtmlBuffer.join(""),
            tags: tags
        };
    }

    ////////////////////////////////////////////////////////
    //  以 下 是 目 录 / 事 件 处 理 / 动 效
    ////////////////////////////////////////////////////////

    // 跳转到某个Poster
    function TurnTo(elementId) {
        let targetTop = window.pageYOffset + $(`#${elementId}`)[0].getBoundingClientRect().top;
        $('html, body').animate({ scrollTop: targetTop-40 }, 200, 'easeOutExpo'); // 照顾顶部sticky导航栏的40px高度
    }

    // 遍历所有Poster，根据当前滚动位置，计算当前显示的Poster是哪个
    function GetVisiblePoster() {
        let posterDOMs = $(".Poster");
        let currentTop = window.pageYOffset + 42;
        for(let i = 0; i < posterDOMs.length - 1; i++) {
            let currentPosterTop = window.pageYOffset + posterDOMs[i].getBoundingClientRect().top;
            let nextPosterTop = window.pageYOffset + posterDOMs[i+1].getBoundingClientRect().top;
            if(currentTop > currentPosterTop && currentTop < nextPosterTop) {
                return posterDOMs[i].id;
            }
        }
        return undefined;
    }

    // 针对标签作倒排索引
    function Indexer(posters) {
        let InverseIndex = new Object();
        for(let i = 0; i < posters.length; i++) {
            let tags = posters[i].tags;
            for(let j = 0; j < tags.length; j++) {
                if(tags[j] in InverseIndex) {
                    InverseIndex[tags[j]].push(i);
                }
                else {
                    InverseIndex[tags[j]] = [i];
                }
            }
        }
        return InverseIndex;
    }

    // 绘制所有Posters
    function PaintPosters() {
        $('#InspirationContainer').html(html);

        SlideInOneByOne("Poster", 10, 800, 20, () => {
            $('.InspirationEnding').html('底部文字');
            // console.table(posters);
        });
    }

    // 绘制目录
    function PaintNavbox(posterIndexes, currentTag) {
        currentTag = currentTag || "";
        // 绘制左侧目录
        let navHtml = new Array();
        for(let i = 0; i < posterIndexes.length; i++) {
            let posterIndex = posterIndexes[i];
            let prevPosterIndex = posterIndexes[i-1];
            let inspiration = posters[posterIndex];
            let thisYear = inspiration.date.split("-")[0];
            if(i === 0 || (prevPosterIndex >= 0 && thisYear !== posters[prevPosterIndex].date.split("-")[0])) {
                if(isNaN(parseInt(thisYear))) {
                    navHtml.push(`<div class="InspirationMenuItemHrline"><span style="position: absolute; top: -8px; margin-left: 30px; padding: 0 4px; background-color: #fff;">${thisYear}</span></div>`);
                }
                else {
                    navHtml.push(`<div class="InspirationMenuItemHrline"><span style="position: absolute; top: -8px; margin-left: 30px; padding: 0 4px; background-color: #fff;">${thisYear}年</span></div>`);
                }
            }
            navHtml.push(`<div class="InspirationMenuItem" data-poster-id="Poster_${inspiration.id}" id="TurnTo_Poster_${inspiration.id}">${inspiration.title}</div>`);
        }
        $("#InspirationMenuList").html(navHtml.join(""));

        // 绘制标签
        let tagHtml = new Array();
        // 首先添加一个清除选择按钮
        tagHtml.push(`<span class="InspirationMenuTagItem InspirationMenuTagItem_clear" data-tag="">全部</span>`);
        let invIndex = Indexer(posters);
        for(let tag in invIndex) {
            let activeCSS = "";
            if(currentTag === tag) {
                activeCSS = " InspirationMenuTagItem_active";
            }
            tagHtml.push(`<span class="InspirationMenuTagItem${activeCSS}" data-tag="${tag}">${tag} (${invIndex[tag].length})</span>`);
        }
        $("#InspirationMenuTags").html(tagHtml.join(""));

        // 注册目录标题的点击跳转事件
        $(".InspirationMenuItem").each((i, e) => {
            $(e).click(() => {
                let posterId = $(e).attr("data-poster-id");
                TurnTo(posterId);
                MenuToggle("off");
            });
        });

        // 注册标签的点击事件
        $(".InspirationMenuTagItem").each((i, e) => {
            $(e).click(() => {
                let tag = $(e).attr("data-tag");
                let indexes = Indexer(posters);
                if(tag !== "") {
                    PaintNavbox(indexes[tag], tag);
                }
                else {
                    PaintNavbox(Array.from(posters.keys()));
                }
            });
        });

    }

    function Paint() {
        // 关闭所有已经打开的目录菜单
        MenuToggle("off");
        // 绘制内容
        PaintPosters();
        // 绘制目录
        PaintNavbox(Array.from(posters.keys()));
    }


    ////////////////////////////////////////////////////////
    //  函 数 主 体 部 分
    ////////////////////////////////////////////////////////

    $('.InspirationEnding').html('正在读取，请稍等…');

    let xhr = new XMLHttpRequest();
    xhr.open("GET", `./markdown/inspirations.md`);
    xhr.onreadystatechange = () => {
        if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            $("#Progressbar").animate({width: `100%`});
            $("#Progressbar").fadeOut();

            // 解析
            posters = ParsePosters(xhr.responseText);
            html = RenderPosters(posters);

            Paint();
        }
        else if(xhr.readyState === XMLHttpRequest.DONE && xhr.status !== 200){
            $("#Progressbar").animate({width: `100%`});
            $("#Progressbar").fadeOut();
            $('.InspirationEnding').html('灵感不见了 >_<');
            return;
        }
    };
    xhr.onprogress = (event) => {
        const MAX_ARTICLE_LENGTH = 64000; // 最大字节数，用于近似计算加载进度
        let percentage = parseInt((event.loaded / MAX_ARTICLE_LENGTH) * 100);
        $("#Progressbar").animate({width: `${((percentage > 100) ? 100 : percentage)}%`});
    };
    xhr.send();

    // 指示滚动位置
    window.onscroll = () => {
        let visiblePosterId = GetVisiblePoster();
        $(`.InspirationMenuItem`).removeClass("InspirationMenuItem_active");
        $(`#TurnTo_${visiblePosterId}`).addClass("InspirationMenuItem_active");
    };

    $(window).resize();

}
