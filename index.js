var through = require('through2');
var gutil = require('gulp-util');
var async = require('async');
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var url = require('url');
var PluginError = gutil.PluginError;

// https://github.com/mishoo/UglifyJS2/issues/495
// Changing to double quotes... A minifier should not impose its own coding standards
//var uglify = require('uglify-js');

// Consts
const PLUGIN_NAME = 'gulp-bookmarkleter';

var makeAbsoluteFileName = function makeAbsoluteFileName(file, fileName) {
	
	return path.join(path.dirname(file.path), fileName);
};


function loadFileContents(fileSrc, callback) {

	fs.readFile(fileSrc, 'utf8', function (err,data) {

		if (err) {
			return console.log(err);
		}
		
		callback(null, data.replace(/\s+/g, " "));

	});

}

function processFile(file, callback) {

	var $ = cheerio.load(file.contents.toString(), {
		decodeEntities: false
	});
	var files = [];

	$("bookmarklet").each(function(i, el) {

		var $el = $(el);
		var src = makeAbsoluteFileName(file, $el.attr("src"));

		files.push(src);

	});


	async.parallel(files.map(function(file) {

		return loadFileContents.bind(null, file);

	}), function(err, results) {

		$("bookmarklet").each(function(i, el) {

			var fileContents = results[i];
			var $el = $(el);
			var attrs = $el.attr();
			delete attrs['src'];
			console.log(attrs);
			
			var $newEl = $('<a href="javascript:' + fileContents + '">' + $el.html() + '</a>');
			
			for(var key in attrs) {
				
				$newEl.attr(key, attrs[key]);
				
			}
			
			$el.replaceWith($newEl);

		});
		
		

		callback(null, $.html());

	});

}

function gulpBookmarkleter() {

	return through.obj(function(file, enc, cb) {

		if (file.isNull()) {

			return cb(null, file);

		}

		if (file.isBuffer()) {

			processFile(file, function(err, processedFile) {

				file.contents = new Buffer(processedFile);

				cb(null, file);

			});


		} else if (file.isStream()) {
			
			throw new PluginError(PLUGIN_NAME, "Stream isn't supported at the moment");
			
			cb(null, file);

		}



	});

}

// Exporting the plugin main function
module.exports = gulpBookmarkleter;