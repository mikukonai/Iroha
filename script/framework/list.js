
// Framework IROHA V4.0
// mikukonai.com
// Copyright © 2016-2019 Mikukonai

// 载入并渲染列表
function LoadList(articleType) {

    // 标题→文件名
    function TitleToFilename(title) {
        return title.replace(/\s+/gi, "-");
    }

    // 解析列表文本
    // 列表格式：
    // ; 分号开头的行是注释
    // ::类别名称  若干空格  颜色代码
    // ## 分类名称 | 分类别名
    // 文章标题 | 类别 | 日期 | 标签,...
    // *置顶文章标题 | ...

    function ParseArticleList(articleList) {
        let items = new Array();
        let typeColorMapping = new Object();
        let lines = articleList.split(/\n+/gi);
        let currentCategory = "";
        for(let line of lines) {
            line = line.trim();
            // 跳过空行或者注释行
            if(line.length <= 0 || /^\;/gi.test(line)) {
                continue;
            }
            // 类别颜色定义
            else if(/^\:\:/gi.test(line)) {
                let fields = line.replace(/^\:\:/gi, "").split(/\s+/gi);
                typeColorMapping[fields[0]] = fields[1];
            }
            // 表示文章分类的行
            else if(/^\#\#\s+/.test(line)) {
                currentCategory = line.replace(/^\#\#\s+/gi, "").trim();
            }
            // 文章信息行
            else {
                let fields = line.split('|');
                let title = fields[0] ? fields[0].trim() : "";
                let type  = fields[1] ? fields[1].trim() : "";
                let date  = fields[2] ? fields[2].trim() : "";
                let tags  = fields[3] ? fields[3].trim() : "";
                let isPinned = /^\*/gi.test(title);
                items.push({
                    "title": title.replace(/^\*/gi, ""),
                    "type": type,
                    "category": currentCategory,
                    "date": date,
                    "tags": (tags.trim().length === 0) ? [] : tags.split(","),
                    "isPinned": isPinned
                });
            }
        }
        let ListObject = {
            "items": items,
            "typeColorMapping": typeColorMapping
        };

        return ListObject;
    }


    // 列表渲染为HTML
    function RenderArticleList(ListObject, listingMode) {
        // 组装简单列表
        function RenderList(items) {
            // const FillZero = (num) => { return ('000000' + num.toString()).substr(-2); };
            let HtmlBuffer = new Array();
            for(let i = 0; i < items.length; i++) {
                let item = items[i];
                // 条目颜色
                let itemColor = ListObject.typeColorMapping[item.type] || "#cdcdcd";
                // 组装链接
                let itemLink = `${articleType}/${TitleToFilename(item.title)}`;
                // 组装标签
                let tagsHtml = "";
                for(let j = 0; j < item.tags.length; j++) {
                    tagsHtml += `<span class="ListItemTag">${item.tags[j]}</span>`;
                }
                // 组装HTML
                HtmlBuffer.push(`<div class="ListItem enter"><span class="ListItemNumber" style="color:${itemColor};">❖</span><span style="display:inline-block;max-width:50%;"><a class="ListItemLink SPA_TRIGGER" data-target="${itemLink}">${item.title}</a>${tagsHtml}</span><span class="ListItemDate"><span style="padding-right:6px;color:${itemColor};">${item.type}</span>${item.date}</span></div>`);
            }
            return HtmlBuffer.join("");
        }

        if(listingMode === "category") {
            // 对列表进行归类
            let catLists = new Object();
            for(let i = 0; i < ListObject.items.length; i++) {
                let category = ListObject.items[i].category;
                if(!(category in catLists)) {
                    catLists[category] = new Array();
                }
                catLists[category].push(ListObject.items[i]);
            }

            // 对每个分类进行拼装HTML
            let HtmlBuffer = new Array();
            let catCount = 0;
            for(let cat in catLists) {
                let catTitle = cat.split('|')[0];
                let catSubtitle = cat.split('|')[1];
                let catSubtitleHtml = "";
                if(catSubtitle && catSubtitle !== "") {
                    catSubtitleHtml = ` · ${catSubtitle}`;
                }
                HtmlBuffer.push(`<div class="ListCategoryBlock" id="cat_${catCount}">
    <div class="ListCategoryBlockTitle enter">${catTitle}<span class="ListCategoryBlockTitle_en">${catSubtitleHtml}</span></div>`);
                HtmlBuffer.push(RenderList(catLists[cat]));
                HtmlBuffer.push('</div>');
                catCount++;
            }
            document.getElementById('ListContainer').innerHTML = HtmlBuffer.join("");
        }

        else {
            // 对日期进行排序
            ListObject.items.sort((a, b) => {
                if(a.isPinned) { return -1; }
                else if(b.isPinned) { return 1; }
                else {
                    let aNumber = parseInt(a.date.replace(/\-/gi, ""));
                    let bNumber = parseInt(b.date.replace(/\-/gi, ""));
                    if(isNaN(aNumber)) {
                        if(isNaN(bNumber)) return 0;
                        else return 1;
                    }
                    else {
                        if(isNaN(bNumber)) return -1;
                        else return (aNumber > bNumber) ? (-1) : ((aNumber < bNumber) ? (1) : 0);
                    }
                }
            });
            document.getElementById('ListContainer').innerHTML = `<div class="ListCategoryBlock">${RenderList(ListObject.items)}</div>`;
        }

        // 淡入动画
        SlideInOneByOne("enter", 10, 1000, 5);

        console.log(`[Iroha-SPA] 列表渲染完毕，计 ${ListObject.items.length} 项`);
    }

    /////////////////////////////
    //  函 数 主 体 部 分
    /////////////////////////////

    // 初始化文章列表监听器
    LIST_OBSERVER = new MutationObserver((mutations, observer) => {
        clearTimeout(OBSERVER_THROTTLE_TIMER);
        OBSERVER_THROTTLE_TIMER = setTimeout(() => {
            console.log(`[Iroha-SPA] 监听器：列表已更新`);
            SPA_RegisterTriggers();
        }, 100); // 100ms节流
    });
    LIST_OBSERVER.observe(document.getElementById('ListContainer'), {characterData: true, childList: true, subtree: true});

    let listEndingSlogan = $('.ListEnding').html();
    $('.ListEnding').html('正在读取，请稍等…');

    let xhr = new XMLHttpRequest();
    xhr.open("GET", `markdown/${articleType}/-articles.md`);
    xhr.onreadystatechange = () => {
        if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            $("#Progressbar").animate({width: `100%`});
            $("#Progressbar").fadeOut();
            let CONTENTS = ParseArticleList(xhr.responseText);

            RenderArticleList(CONTENTS, SORTING_OPTION);

            // 排序选项按钮
            $(`.ListSortingOption[data-sorting-option=${SORTING_OPTION}]`).addClass('ListSortingOptionSelected');
            $(`.ListSortingOption`).each((i, e) => {
                $(e).click(() => {
                    let sortingOption = $(e).attr("data-sorting-option");
                    $(".ListSortingOption").removeClass("ListSortingOptionSelected");
                    $(e).addClass("ListSortingOptionSelected");
                    RenderArticleList(CONTENTS, sortingOption);
                    SORTING_OPTION = sortingOption;
                });
            });

            $('.ListEnding').html(listEndingSlogan);
        }
        else if(xhr.readyState === XMLHttpRequest.DONE && xhr.status !== 200){
            $("#Progressbar").animate({width: `100%`});
            $("#Progressbar").fadeOut();
            $('.ListEnding').html('列表获取失败 >_<');
            return;
        }
    };
    xhr.onprogress = (event) => {
        const MAX_ARTICLE_LENGTH = 20000; // 最大字节数，用于近似计算加载进度
        let percentage = parseInt((event.loaded / MAX_ARTICLE_LENGTH) * 100);
        $("#Progressbar").animate({width: `${((percentage > 100) ? 100 : percentage)}%`});
    };
    xhr.send();
}

