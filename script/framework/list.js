
// Framework IROHA V4.0
// mikukonai.com
// Copyright © 2016-2019 Mikukonai

// 载入并渲染列表
function LoadList(pageId) {

    // 标题→文件名
    function TitleToFilename(title) {
        return title.replace(/\s+/gi, "-");
    }

    // 渲染时间线
    function RenderTimeline(articleList) {
        let articles = new Object();
        for(let i = 0; i < articleList.length; i++) {
            let dates = new Array();
            dates.push(articleList[i].date);
            dates = dates.concat(articleList[i].updates);
            for(let j = 0; j < dates.length; j++) {
                let date = dates[j];
                if(!articles[date]) {
                    articles[date] = new Array();
                }
                articles[date].push(articleList[i]);
            }
        }

        $("#WeekCountContainer").append(`<td class="WeekCount"></td>`);
        $("#DaysContainer").append(`<td>
            <div class="Weektag">月</div>
            <div class="Weektag">火</div>
            <div class="Weektag">水</div>
            <div class="Weektag">木</div>
            <div class="Weektag">金</div>
            <div class="Weektag">土</div>
            <div class="Weektag">日</div>
        </td>`);

        let date = new Date();
        let currentMonth = date.getMonth() + 1;

        let weekDayCount = 0;
        let weekCount = 0;
        let newYearDayWeek = new Date(date.getFullYear(), 0, 1).getDay(); // 当年元旦是星期几
        newYearDayWeek = (newYearDayWeek === 0) ? 7 : newYearDayWeek;
        const MONTH_DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let isLeapYear = false;
        let fullyear = date.getFullYear();
        if(fullyear % 100 === 0) {
            if(fullyear % 400 === 0) isLeapYear = true;
            else isLeapYear = false;
        }
        else {
            if(fullyear % 4 === 0) isLeapYear = true;
            else isLeapYear = false;
        }
        let weekRowStr = `<td>`;

        // 处理1月1日之前的空格（TODO 每年第一周的处理逻辑应对标ISO8601）
        newYearDayWeek--;
        while(newYearDayWeek > 0) {
            weekRowStr += `<div class="Day Blank"></div>`;
            weekDayCount++;
            newYearDayWeek--;
        }

        for(let month = 1; month <= currentMonth; month++) { // 注意getMonth()返回的月份数字从0开始
            monthDays = MONTH_DAYS[month];
            if(month === 2 && isLeapYear === true) monthDays++;
            for(let day = 1; day <= monthDays; day++) {
                let firstDay = (day === 1) ? " Firstday" : "";
                let monthString = ("00" + String(month)).slice(-2);
                let dayString = ("00" + String(day)).slice(-2);
                let dateString = `${date.getFullYear()}-${monthString}-${dayString}`;
    
                let level = "";
                if(articles[dateString]) {
                    let articleNumber = articles[dateString].length;
                    if(articleNumber === 1) { level = " L1"; }
                    else if(articleNumber === 2) { level = " L2"; }
                    else if(articleNumber === 3) { level = " L3"; }
                    else if(articleNumber  >= 4) { level = " L4"; }
                }
                else {
                    level = "";
                }
                weekRowStr += `<div class="Day${firstDay}${level}" id="Article-${dateString}" data-date="${dateString}" title="${dateString}"></div>`;
                weekDayCount++;
                if(weekDayCount % 7 === 0) {
                    weekCount++;
                    weekRowStr += `</td>`;
                    $("#DaysContainer").append(weekRowStr);
                    $("#WeekCountContainer").append(`<td class="WeekCount">${weekCount}</td>`);
                    weekRowStr = `<td>`;
                }
                else if(day === monthDays && month === currentMonth) {
                    weekCount++;
                    let blanks = 7 - weekDayCount % 7;
                    if(blanks < 7) {
                        for(let i = 0; i < blanks; i++) {
                            weekRowStr += `<div class="Day Blank"></div>`;
                        }
                    }
                    weekRowStr += `</td>`;
                    $("#DaysContainer").append(weekRowStr);
                    $("#WeekCountContainer").append(`<td class="WeekCount">${weekCount}</td>`);
                    weekRowStr = `<td>`;
                }
            }
        }

        // 转到某个文章的位置
        function TurnToArticle(title) {
            let targetTop = window.pageYOffset + $(`div[data-title='${title}']`)[0].getBoundingClientRect().top;
            $('html, body').animate({ scrollTop: targetTop-40 }, 200, 'easeOutExpo'); // 照顾顶部sticky导航栏的40px高度
        }
    
        $(".Day").each((i, e) => {
            $(e).click(() => {
                let date = $(e).attr("data-date");
                if(date in articles) {
                    RenderArticleList(articles[date]);
                    TurnToArticle(articles[date][0].title);
                }
            });
        });
    }

    // 列表渲染为HTML
    function RenderArticleList(articleList, listingMode) {

        // 标题→文件名
        function TitleToFilename(title) {
            return title.replace(/\s+/gi, "-");
        }

        let HtmlBuffer = new Array();
        for(let i = 0; i < articleList.length; i++) {
            let articleInfo = articleList[i];
            let title = articleInfo.title;
            let date = articleInfo.date;
            let authors = articleInfo.authors;
            let category = articleInfo.category;
            let copyright = articleInfo.copyright;
            let tags = articleInfo.tags;
            let cover = articleInfo.cover;

            let tagString = "";
            for(let j = 0; j < tags.length; j++) {
                tagString += `<span class="ArticleTag">${tags[j]}</span>`;
            }
            if(tags.length > 0) tagString += " / ";

            let coverHtml = (!cover || cover.length <= 0) ? "" : `<img class="ArticleCover" src="${cover}">`;

            let html = `
<div class="ArticleItem enter" data-title="${title}">
    ${coverHtml}
    <div class="ArticleTitle"><span class="ArticleTitleLink SPA_TRIGGER" data-target="${pageId}/${TitleToFilename(title)}">${title}</span></div>
    <div class="ArticleInfo">${tagString}${category} / ${date}</div>
</div>`;

            HtmlBuffer.push(html);
        }

        document.getElementById('ListContainer').innerHTML = HtmlBuffer.join("");

        // SlideInOneByOne("enter", 10, 1000, 5);

        console.log(`[Iroha-SPA] 列表渲染完毕，计 ${articleList.length} 项`);

        /*
        // 组装简单列表
        function RenderList(items) {
            // const FillZero = (num) => { return ('000000' + num.toString()).substr(-2); };
            let HtmlBuffer = new Array();
            for(let i = 0; i < items.length; i++) {
                let item = items[i];
                // 条目颜色
                let itemColor = listObject.typeColorMapping[item.type] || "#cdcdcd";
                // 组装链接
                let itemLink = `${pageId}/${TitleToFilename(item.title)}`;
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
            for(let i = 0; i < listObject.items.length; i++) {
                let category = listObject.items[i].category;
                if(!(category in catLists)) {
                    catLists[category] = new Array();
                }
                catLists[category].push(listObject.items[i]);
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
            listObject.items.sort((a, b) => {
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
            document.getElementById('ListContainer').innerHTML = `<div class="ListCategoryBlock">${RenderList(listObject.items)}</div>`;
        }

        // 淡入动画
        SlideInOneByOne("enter", 10, 1000, 5);

        console.log(`[Iroha-SPA] 列表渲染完毕，计 ${listObject.items.length} 项`);
        */
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
    xhr.open("GET", `markdown/${pageId}/-articles.json`);
    xhr.onreadystatechange = () => {
        if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            $("#Progressbar").animate({width: `100%`});
            $("#Progressbar").fadeOut();

            // 绘制文章列表
            let contents = JSON.parse(xhr.responseText); // ParseArticleList(xhr.responseText);
            RenderArticleList(contents, SORTING_OPTION);

            // 绘制时间线
            RenderTimeline(contents);

            // 排序选项按钮
            $(`.ListSortingOption[data-sorting-option=${SORTING_OPTION}]`).addClass('ListSortingOptionSelected');
            $(`.ListSortingOption`).each((i, e) => {
                $(e).click(() => {
                    let sortingOption = $(e).attr("data-sorting-option");
                    $(".ListSortingOption").removeClass("ListSortingOptionSelected");
                    $(e).addClass("ListSortingOptionSelected");
                    RenderArticleList(contents, sortingOption);
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

