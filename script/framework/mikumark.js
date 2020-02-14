// Mikumark V3.0
// Markdown Parser
// 2019.10 Refactored in TypeScript
// Arch:
// MD → [Parser] → MarkdownDocument object(HTML included) → [Painter] → Web page
// Document:
/*
#!title: 标题
#!authors: 作者1, 作者2, ...
#!date: 2019-10-11
#!cover: 封面图片链接
#!type: 类型
#!tags: 标签1, 标签2, ...
#!{macro1}: 单行Markdown脚本
#!content
此处为正文
#!base64
此处为base64编码的正文（目的是防止搜索引擎抓取。注意：如果文档中出现了这一节，则不会解析content。其他字段正常解析。）
#!style
此处为CSS
#!script: 外部脚本路径
#!script
此处为JS代码
#!metadata
此处为元数据（JSON）
*/
var Mikumark = /** @class */ (function () {
    function Mikumark(doc) {
        this.title = "";
        this.authors = new Array();
        this.date = "2016-11-24";
        this.cover = "";
        this.type = "";
        this.tags = new Array();
        this.outline = new Array();
        this.linkedScripts = new Array();
        this.linkedStyles = new Array();
        this.macros = new Map();
        this.titleCount = 0;
        this.Parse(doc);
        // console.log("Mikumark.js Markdown Parser V3.4");
        // console.log(this);
    }
    // 元字符转义
    Mikumark.EscapeMetachar = function (str) {
        return str
            .replace(/\\\*/g, Mikumark.C_STAR).replace(/\\\~/g, Mikumark.C_WAVE).replace(/\\\`/g, Mikumark.C_REVQ)
            .replace(/\\\[/g, Mikumark.C_LSQB).replace(/\\\]/g, Mikumark.C_RSQB).replace(/\\\(/g, Mikumark.C_LRDB)
            .replace(/\\\)/g, Mikumark.C_RRDB).replace(/\\\$/g, Mikumark.C_DOLR).replace(/\\\|/g, Mikumark.C_VERT)
            .replace(/\\\+/g, Mikumark.C_PLUS).replace(/\\\\/g, Mikumark.C_BSLT).replace(/\\\#/g, Mikumark.C_SHRP)
            .replace(/\\\-/g, Mikumark.C_MNUS).replace(/\\\&/g, Mikumark.C_AMPS).replace(/\\\%/g, Mikumark.C_PCNT);
    };
    // 元字符覆盖
    Mikumark.CoverMetachar = function (str) {
        return str
            .replace(/\*/g, Mikumark.C_STAR).replace(/\~/g, Mikumark.C_WAVE).replace(/\`/g, Mikumark.C_REVQ)
            .replace(/\[/g, Mikumark.C_LSQB).replace(/\]/g, Mikumark.C_RSQB).replace(/\(/g, Mikumark.C_LRDB)
            .replace(/\)/g, Mikumark.C_RRDB).replace(/\$/g, Mikumark.C_DOLR).replace(/\|/g, Mikumark.C_VERT)
            .replace(/\+/g, Mikumark.C_PLUS).replace(/\\/g, Mikumark.C_BSLT).replace(/\#/g, Mikumark.C_SHRP)
            .replace(/\-/g, Mikumark.C_MNUS).replace(/\&/g, Mikumark.C_AMPS).replace(/\%/g, Mikumark.C_PCNT);
    };
    // 元字符换回
    Mikumark.RecoverMetachar = function (str) {
        return str
            .replace(new RegExp(Mikumark.C_STAR, 'g'), '*').replace(new RegExp(Mikumark.C_WAVE, 'g'), '~').replace(new RegExp(Mikumark.C_REVQ, 'g'), '`')
            .replace(new RegExp(Mikumark.C_LSQB, 'g'), '[').replace(new RegExp(Mikumark.C_RSQB, 'g'), ']').replace(new RegExp(Mikumark.C_LRDB, 'g'), '(')
            .replace(new RegExp(Mikumark.C_RRDB, 'g'), ')').replace(new RegExp(Mikumark.C_DOLR, 'g'), '$').replace(new RegExp(Mikumark.C_VERT, 'g'), '|')
            .replace(new RegExp(Mikumark.C_PLUS, 'g'), '+').replace(new RegExp(Mikumark.C_BSLT, 'g'), '\\').replace(new RegExp(Mikumark.C_SHRP, 'g'), '#')
            .replace(new RegExp(Mikumark.C_MNUS, 'g'), '-').replace(new RegExp(Mikumark.C_AMPS, 'g'), '&').replace(new RegExp(Mikumark.C_PCNT, 'g'), '%');
    };
    // 覆盖HTML元字符
    Mikumark.CoverHTMLchar = function (str) {
        return str.replace(/>/gi, "&gt;").replace(/</gi, "&lt;").replace(/&/gi, "&amp;");
    };
    // 换回HTML元字符
    Mikumark.RecoverHTMLchar = function (str) {
        return str.replace(/&gt;/gi, ">").replace(/&lt;/gi, "<").replace(/&amp;/gi, "&");
    };
    // 处理宏展开（注意：不会递归展开，每个宏只被展开一次）
    Mikumark.prototype.ExpandMacros = function (str) {
        for (var macro in this.macros) {
            str = str.replace(new RegExp(macro, "g"), this.macros[macro]);
        }
        return str;
    };
    // 段内样式解析
    Mikumark.prototype.ParseInnerPara = function (md) {
        var RegexInlineCode = /\`(.+?)\`/g;
        var RegexTag = /\#\((.+?)\)\#/g;
        var RegexBold = /\*\*(.+?)\*\*/g;
        var RegexItalic = /%%(.+?)%%/g;
        var RegexDeleted = /~(.+?)~/g;
        var RegexColor = /\[\[(#?[a-zA-Z0-9]+?)\:(.+?)#\]\]/g;
        var RegexSelfLink = /\[(.+?)\]\(\)/g;
        var RegexLink = /\[(.+?)\]\((.+?)\)/g;
        // 首先处理换行
        var HTML = md.replace(/[\n\r]/g, "<br/>");
        // 宏展开
        HTML = this.ExpandMacros(HTML);
        // 行内代码：需要特殊处理，其内的所有元字符都应被转义，防止解析成HTML标签。（不会处理已屏蔽的元字符）
        var inlineCodeSegments = RegexInlineCode.exec(HTML);
        while (inlineCodeSegments !== null) {
            HTML = HTML.replace(inlineCodeSegments[0], "<code class=\"MikumarkCode\">" + Mikumark.CoverHTMLchar(Mikumark.CoverMetachar(inlineCodeSegments[1])) + "</code>");
            inlineCodeSegments = RegexInlineCode.exec(HTML);
        }
        // TODO 处理标签
        HTML = Mikumark.EscapeMetachar(HTML);
        HTML = HTML.replace(RegexTag, "<span class=\"MikumarkTag\">$1</span>")
            .replace(RegexBold, "<b>$1</b>")
            .replace(RegexItalic, "<i>$1</i>")
            .replace(RegexDeleted, "<del>$1</del>")
            .replace(RegexColor, "<span style=\"color:$1;\">$2</span>")
            .replace(RegexSelfLink, "<a class=\"MikumarkLink\" target=\"_blank\" href=\"$1\">$1</a>")
            .replace(RegexLink, "<a class=\"MikumarkLink\" target=\"_blank\" href=\"$2\">$1</a>");
        // return Mikumark.RecoverHTMLchar(Mikumark.RecoverMetachar(HTML));
        return Mikumark.RecoverMetachar(HTML);
    };
    // 段落级样式解析
    Mikumark.prototype.ParsePara = function (md) {
        if (md.length <= 0)
            return "";
        var HtmlBuffer = new Array();
        md = md.trim();
        // 标题
        if (/^#+?(?![\!\(]).+/g.test(md) === true) {
            var level = (md.match(/^#+(?=[^#])/i)[0]).length;
            var title = md.replace(/^#+/g, "").trim();
            title = this.ExpandMacros(title);
            HtmlBuffer.push("<h" + level + " id=\"Title_" + this.titleCount + "\" class=\"MikumarkTitle\">" + title + "</h" + level + ">");
            // 目录
            this.outline[this.titleCount] = {
                level: level,
                title: title
            };
            this.titleCount++;
        }
        // 分割线（至少3个连续dash的单行段落）
        else if (/^\-{3,}$/g.test(md) === true) {
            HtmlBuffer.push("<hr class=\"MikumarkHorizontalLine\"/>");
        }
        // 有序列表（+号开头的段落）
        else if (/^\++[\s\S]+/g.test(md) === true) {
            // 按行分割列表项
            var lines = md.split("\n");
            // 层级计数器
            var currentLevel = 0;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                // 计算+号数量（列表层级）
                var prefix = line.match(/^\++(?=[^\+])/i);
                if (prefix == null) {
                    HtmlBuffer.push(md);
                    break;
                }
                var level = prefix[0].length;
                // 列表文本
                var item = line.replace(/^\++/g, "").trim();
                // 判断层级是否改变
                if (level > currentLevel) { // 嵌套加深
                    for (var c = 0; c < (level - currentLevel); c++) {
                        HtmlBuffer.push("<ol class=\"MikumarkList\">");
                    }
                    HtmlBuffer.push("<li class=\"MikumarkListItem\">");
                    HtmlBuffer.push(this.ParseInnerPara(item));
                    currentLevel = level;
                }
                else if (level < currentLevel) { // 嵌套退出
                    for (var c = 0; c < (currentLevel - level); c++) {
                        HtmlBuffer.push("</li></ol>");
                    }
                    HtmlBuffer.push("</li><li class=\"MikumarkListItem\">");
                    HtmlBuffer.push(this.ParseInnerPara(item));
                    currentLevel = level;
                }
                else { // 保持同级
                    HtmlBuffer.push("</li><li class=\"MikumarkListItem\">");
                    HtmlBuffer.push(this.ParseInnerPara(item));
                    currentLevel = level;
                }
            }
            // 闭合列表标签
            for (var c = 0; c < currentLevel; c++) {
                HtmlBuffer.push("</li></ol>");
            }
        }
        // 无序列表（-号开头的段落）
        else if (/^\-+[\s\S]+/g.test(md) === true) {
            // 按行分割列表项
            var lines = md.split("\n");
            // 层级计数器
            var currentLevel = 0;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                // 计算-号数量（列表层级）
                var prefix = line.match(/^\-+(?=[^\-])/i);
                if (prefix == null) {
                    HtmlBuffer.push(md);
                    break;
                }
                var level = prefix[0].length;
                // 列表文本
                var item = line.replace(/^\-+/g, "").trim();
                // 判断层级是否改变
                if (level > currentLevel) { // 嵌套加深
                    for (var c = 0; c < (level - currentLevel); c++) {
                        HtmlBuffer.push("<ul class=\"MikumarkList\">");
                    }
                    HtmlBuffer.push("<li class=\"MikumarkListItem\">");
                    HtmlBuffer.push(this.ParseInnerPara(item));
                    currentLevel = level;
                }
                else if (level < currentLevel) { // 嵌套退出
                    for (var c = 0; c < (currentLevel - level); c++) {
                        HtmlBuffer.push("</li></ul>");
                    }
                    HtmlBuffer.push("</li><li class=\"MikumarkListItem\">");
                    HtmlBuffer.push(this.ParseInnerPara(item));
                    currentLevel = level;
                }
                else { // 保持同级
                    HtmlBuffer.push("</li><li class=\"MikumarkListItem\">");
                    HtmlBuffer.push(this.ParseInnerPara(item));
                    currentLevel = level;
                }
            }
            // 闭合列表标签
            for (var c = 0; c < currentLevel; c++) {
                HtmlBuffer.push("</li></ul>");
            }
        }
        // 表格
        else if (/^\|[\s\S]+\|$/g.test(md) === true) {
            // 按行分割
            var rows = md.split("\n");
            // 分割线标识
            var hasHeadline = false;
            // 对齐方式：下标为列序号（从1开始）
            var alignType = new Array();
            HtmlBuffer.push('<div class="MikumarkTableContainer"><table class="MikumarkTable">');
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                var cols = row.split("|");
                if (cols.length <= 2) {
                    console.log("Syntax error.");
                    return;
                }
                if (cols.length == 3 && /\-{3,}/i.test(cols[1]) == true) {
                    hasHeadline = true;
                }
                else {
                    HtmlBuffer.push('<tr>');
                    if (hasHeadline == true) { // TD表格主体
                        for (var c = 1; c < cols.length - 1; c++) {
                            HtmlBuffer.push("<td" + (alignType[c] ? alignType[c] : '') + ">" + this.ParseInnerPara(cols[c]) + "</td>");
                        }
                    }
                    else { // TH表头
                        for (var c = 1; c < cols.length - 1; c++) {
                            // 记录对齐方式
                            if (/^\:.*\:$/gi.test(cols[c])) {
                                alignType[c] = " style=\"text-align:center;\"";
                            }
                            else if (/\:$/gi.test(cols[c])) {
                                alignType[c] = " style=\"text-align:right;\"";
                            }
                            else if (/^\:/gi.test(cols[c])) {
                                alignType[c] = " style=\"text-align:left;\"";
                            }
                            else {
                                alignType[c] = '';
                            }
                            cols[c] = cols[c].replace(/\:$/gi, '').replace(/^\:/gi, '');
                            HtmlBuffer.push("<th" + (alignType[c] ? alignType[c] : '') + ">" + this.ParseInnerPara(cols[c]) + "</th>");
                        }
                    }
                    HtmlBuffer.push('</tr>');
                }
            }
            HtmlBuffer.push('</table></div>');
        }
        // 图片
        else if (/^\!\[.+?\]\(.+?\)$/g.test(md) === true) {
            var imgTitle = md.match(/^\!\[.+\]\(/g)[0];
            imgTitle = imgTitle.substring(2, imgTitle.length - 2);
            var imgURL = md.match(/\]\([^(\]\()]+\)$/g)[0];
            imgURL = imgURL.substring(2, imgURL.length - 1);
            imgURL = this.ExpandMacros(imgURL);
            HtmlBuffer.push("<div class=\"MikumarkImageContainer\">\n            <div class=\"loading\">\n                <div class=\"dot\"></div><div class=\"dot\"></div><div class=\"dot\"></div><div class=\"dot\"></div><div class=\"dot\"></div>\n            </div>\n            <img class=\"MikumarkImage\" data-src=\"" + imgURL + "\"><div class=\"MikumarkImageTitle\">" + this.ParseInnerPara(imgTitle) + "</div></div>");
        }
        // 居中的段落
        else if (/^\:.+/g.test(md) === true) {
            var content = md.substring(1).trim(); // 截取:号后面的内容
            HtmlBuffer.push("<p class=\"MikumarkParagraph\" style=\"text-align:center;\">" + this.ParseInnerPara(content) + "</p>");
        }
        // LaTeX公式段落
        else if (/^\$\$.+?\$\$$/g.test(md) === true) {
            HtmlBuffer.push("<p class=\"MikumarkParagraph\">" + md + "</p>");
        }
        // 单个HTML元素，直接原样返回
        else if (/^<.+?[\s\S]*>$/g.test(md) === true) {
            HtmlBuffer.push(md);
        }
        // 普通段落
        else {
            HtmlBuffer.push("<p class=\"MikumarkParagraph\">" + this.ParseInnerPara(md) + "</p>");
        }
        return HtmlBuffer.join("");
    };
    // 跨段落样式解析
    Mikumark.prototype.ParseInterPara = function (md) {
        var HtmlBuffer = new Array();
        // 首先处理代码块
        var codeBlocks = new Array();
        var mdBuffer = new Array();
        var codeIndex = 0;
        var codeLanguage = "";
        var codeBlockBuffer = new Array();
        var lines = md.split("\n");
        var isInCodeBlock = false;
        var codeBlockQuoteLevel = 0;
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (/^(>*)\s*```/g.test(line) === true) { // 支持在块引用中的代码块
                // 进入代码块
                if (isInCodeBlock === false) {
                    codeBlockQuoteLevel = (line.match(/^>*(?=[^>])/i)[0]).length;
                    codeLanguage = line.replace(/^(>*)\s*```:?/gi, "").toLowerCase();
                    isInCodeBlock = true;
                }
                // 退出代码块
                else {
                    isInCodeBlock = false;
                    mdBuffer.push(">>>>>>>>>>>>>>>>>>>".substring(0, codeBlockQuoteLevel) + "```" + codeIndex);
                    codeBlocks[codeIndex] = {
                        language: codeLanguage,
                        code: Mikumark.CoverHTMLchar(codeBlockBuffer.join(""))
                    };
                    codeIndex++;
                    codeLanguage = "";
                    codeBlockBuffer = new Array();
                    codeBlockQuoteLevel = 0;
                }
            }
            else {
                // 处于代码块内部
                if (isInCodeBlock === true) {
                    codeBlockBuffer.push(line + "\n");
                }
                else {
                    mdBuffer.push(line);
                }
            }
        }
        md = mdBuffer.join("\n"); // 重新组合起来
        // 自然段落分隔
        var paragraphs = md.split(/\n{2,}/g);
        // 遍历各个段落，判断段落类型
        // 引用块计数
        var quoteFlag = false;
        var quoteLevel = 0;
        for (var pcount = 0; pcount < paragraphs.length; pcount++) {
            var paragraph = paragraphs[pcount];
            // 引用框？
            if (/^>.+/g.test(paragraph) === true) {
                quoteFlag = true;
                // >号数量（引用层级）
                var level = (paragraph.match(/^>+(?=[^>])/i)[0]).length;
                // 引用文本
                var quote = paragraph.replace(/^>+/, "").trim();
                // 判断层级是否改变
                if (level > quoteLevel) { // 嵌套加深
                    for (var c = 0; c < (level - quoteLevel); c++) {
                        HtmlBuffer.push("<blockquote class=\"MikumarkBlockquote\">");
                    }
                }
                else if (level < quoteLevel) { // 嵌套退出
                    for (var c = 0; c < (quoteLevel - level); c++) {
                        HtmlBuffer.push("</blockquote>");
                    }
                }
                else { } // 保持同级，不加标签
                // 处理代码块
                if (/^(>*)\s*```\d+/g.test(quote) === true) {
                    HtmlBuffer.push(quote);
                }
                else {
                    HtmlBuffer.push(this.ParsePara(quote));
                }
                quoteLevel = level;
            }
            // 无前缀的段落
            else {
                // 闭合引用标签，并退出引用状态
                if (quoteFlag == true) {
                    for (var c = 0; c < quoteLevel; c++) {
                        HtmlBuffer.push("</blockquote>");
                    }
                    quoteLevel = 0;
                }
                quoteFlag = false;
                if (/^```\d+/g.test(paragraph) === true) {
                    HtmlBuffer.push(paragraph);
                }
                else {
                    HtmlBuffer.push(this.ParsePara(paragraph));
                }
            }
        }
        // 代码写回并高亮
        for (var i = 0; i < HtmlBuffer.length; i++) {
            var para = HtmlBuffer[i];
            if (/^(>*)\s*```/g.test(para) === true) {
                var index = parseInt(para.trim().replace(/^(>*)\s*```/g, ""));
                var codeBlock = codeBlocks[index];
                var code = Mikumark.RecoverHTMLchar(codeBlock.code);
                HtmlBuffer[i] = "<pre class=\"MikumarkPre\"><code class=\"MikumarkCode\">" + code + "</code></pre>";
            }
        }
        return HtmlBuffer.join("");
    };
    // 文档结构解析
    Mikumark.prototype.Parse = function (doc) {
        var contentBuffer = new Array();
        var styleBuffer = new Array();
        var scriptBuffer = new Array();
        var metadataBuffer = new Array();
        var base64Buffer = new Array();
        var state = "content"; // content | style | script | metadata | base64
        var lines = doc.split("\n");
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (/^#!title:/g.test(line) === true) {
                var title = line.replace(/^#!title:/g, "").trim();
                this.title = title;
            }
            else if (/^#!date:/g.test(line) === true) {
                var date = line.replace(/^#!date:/g, "").trim();
                this.date = date;
            }
            else if (/^#!cover:/g.test(line) === true) {
                var cover = line.replace(/^#!cover:/g, "").trim();
                this.cover = cover;
            }
            else if (/^#!type:/g.test(line) === true) {
                var type = line.replace(/^#!type:/g, "").trim();
                this.type = type;
            }
            else if (/^#!authors:/g.test(line) === true) {
                var authors = line.replace(/^#!authors:/g, "").trim().split(",").map(function (e) { return e.trim(); });
                this.authors = authors;
            }
            else if (/^#!tags:/g.test(line) === true) {
                var tags = line.replace(/^#!tags:/g, "").trim().split(",").map(function (e) { return e.trim(); });
                this.tags = tags;
            }
            // 宏定义
            else if (/^#!{(.+?)}:/g.test(line) === true) {
                var macroContent = line.replace(/^#!{(.+?)}:/g, "").trim();
                var macroName = line.split(":")[0].replace(/^#!/g, ""); // 包括大括号
                this.macros[macroName] = macroContent;
            }
            // 外部CSS
            else if (/^#!style:/g.test(line) === true) {
                var cssPath = line.replace(/^#!style:/g, "").trim();
                this.linkedStyles.push(cssPath);
            }
            // 外部脚本
            else if (/^#!script:/g.test(line) === true) {
                var scriptPath = line.replace(/^#!script:/g, "").trim();
                this.linkedScripts.push(scriptPath);
            }
            else if (/^#!base64$/.test(line) === true) {
                state = "base64";
            }
            else if (/^#!content$/.test(line) === true) {
                state = "content";
            }
            else if (/^#!style$/.test(line) === true) {
                state = "style";
            }
            else if (/^#!script$/.test(line) === true) {
                state = "script";
            }
            else if (/^#!metadata$/.test(line) === true) {
                state = "metadata";
            }
            else {
                if (state === "content") {
                    contentBuffer.push(line);
                }
                else if (state === "style") {
                    styleBuffer.push(line);
                }
                else if (state === "script") {
                    scriptBuffer.push(line);
                }
                else if (state === "metadata") {
                    metadataBuffer.push(line);
                }
                else if (state === "base64") {
                    base64Buffer.push(line);
                }
            }
        }
        // Base64解码
        try {
            var base64content = DecodeB64(base64Buffer.join(""));
            if (base64content.length > 0) {
                // let key = EncodeB64(prompt('请输入口令'));
                // if(key !== 'IA==') { // 半角空格{
                //     alert('口令不匹配，返回上一页。');
                //     window.history.go(-1);
                //     return;
                // }
                this.content = base64content;
            }
            else {
                this.content = contentBuffer.join("\n");
            }
        }
        catch (e) {
            console.error("Base64编码字段并非base64编码，跳过。");
            this.content = contentBuffer.join("\n");
            ;
        }
        this.style = styleBuffer.join("\n");
        this.script = scriptBuffer.join("\n");
        try {
            this.metadata = JSON.parse(metadataBuffer.join("\n"));
        }
        catch (e) { }
        this.HTML = this.ParseInterPara(this.content);
    };
    // 元字符常量
    Mikumark.C_STAR = '@STAR@'; // *
    Mikumark.C_WAVE = "@WAVE@"; // ~
    Mikumark.C_REVQ = "@REVQ@"; // `
    Mikumark.C_LSQB = "@LSQB@"; // [
    Mikumark.C_RSQB = "@RSQB@"; // ]
    Mikumark.C_LRDB = "@LRDB@"; // (
    Mikumark.C_RRDB = "@RRDB@"; // )
    Mikumark.C_DOLR = "@DOLR@"; // $
    Mikumark.C_VERT = "@VERT@"; // |
    Mikumark.C_PLUS = "@PLUS@"; // +
    Mikumark.C_MNUS = "@MNUS@"; // -
    Mikumark.C_BSLT = "@BSLT@"; // \
    Mikumark.C_SHRP = "@SHRP@"; // #
    Mikumark.C_AMPS = "@AMPS@"; // &
    Mikumark.C_PCNT = "@PCNT@"; // %
    return Mikumark;
}());
// base64编码
function EncodeB64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}
// base64解码
function DecodeB64(str) {
    return decodeURIComponent(escape(window.atob(str)));
}
