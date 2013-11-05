var argv = require('optimist').argv;
var markdown = require('markdown').markdown;
var fs = require('fs');
var cheerio = require('cheerio');
var temp = require('temp');
var handlebars = require('handlebars');
var epub = require('node-epub');

// Default options for Markdown parse
var TITLE_EL = 'h1';
var CHAPTER_EL = 'h2';

// Templates for XHTML chapter markup
var chapterTemplate = handlebars.compile(fs.readFileSync(__dirname + '/templates/epub-chapter.xhtml', 'utf8'));

// Open and read Markdown file, generate temporary chapter files
fs.readFile(argv.input, 'utf8', function (err, data) {

    var tempdir = temp.mkdirSync('epub');
    var html;
    var title;
    var chapters = [];
    var $;
    var toc;

    if (err) {
        return console.log('Error reading file. ', err);
    }

    // Covnert Markdown to plain HTML and load it up for editing
    $ = cheerio.load(markdown.toHTML(data));

    title = $(TITLE_EL).text();

    // Move through each chapter heading and create new XHTML file
    $(CHAPTER_EL).each(function (item, index) {
        var chapter = {
            'number': chapters.length + 1,
            'id': 'c' + (chapters.length + 1).toString(),
            'title': $(this).text(),
            'filename': 'chapter-' + chapters.length.toString() + '.xhtml',
            'file': tempdir + '/chapter-' + chapters.length.toString() + '.xhtml'
        };
        var chapter_markup = cheerio('section', '<section epub:type="chapter"></section>');
        var element = $(this).next();
        var contents;
        // Add chapter title
        chapter_markup.append($(this).clone().attr('epub:type', 'chapter').attr('id', chapter.id));
        // Append all found tags to current chapter until we hit the next marker
        do {
            chapter_markup.append(element.clone());
            element = element.next();
        } while (element.length && !$(element).is(CHAPTER_EL));
        contents = chapterTemplate({
            title: chapter.title,
            content: $.html(chapter_markup)
        });
        fs.writeFileSync(chapter.file, contents, 'utf8');
        chapters.push(chapter);
    });

    // Make ePub
    book = new epub.Epub({
        title: title,
        author: 'TBA',
        lang: 'en-us',
    });

    // Add each chapter to the book
    chapters.forEach(function (chapter) {
        book.addFile(chapter.file, {
            name: chapter.filename,
            title: chapter.title
        });
    });

    // Output your ePub
    book.generate(title + '.epub');

});
