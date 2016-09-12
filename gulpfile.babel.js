// generated on 2016-06-27 using generator-chrome-extension 0.5.6
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import del from 'del';
import runSequence from 'run-sequence';
import {stream as wiredep} from 'wiredep';
import * as babel from 'gulp-babel';
import jetpack from 'fs-jetpack';

import * as _ from 'lodash';

var projectDir = jetpack;
var srcDir = projectDir.cwd('./app');
var destDir = projectDir.cwd('./dist');

const $ = gulpLoadPlugins();

var paths = {
    copyFromAppDir: [
        './**/*.html',
        './**/*.+(jpg|png|svg)',
        './fonts/**',
        './styles/**',
        '_locales/**',
        "*.json"
    ]
};


gulp.task('copy', function () {
    return projectDir.copyAsync(srcDir.path('.'), destDir.path(), {
            overwrite: true,
            matching: paths.copyFromAppDir
        });
});

function lint(files, options) {
  return () => {
    return gulp.src(files)
      .pipe($.eslint(options))
      .pipe($.eslint.format());
  };
}

gulp.task('lint', lint(srcDir.path('scripts/**/*.js'), {
  env: {
    es6: true
  },
  parserOptions: {
      "ecmaVersion": 6,
      "sourceType": "module",
      "ecmaFeatures": {
        "modules": true
      }
  }
}));

gulp.task('babel', function () {
    return gulp.src(srcDir.path('**/*.js'))
        .pipe(babel.default({presets: ['es2015']}))
        .pipe(gulp.dest(destDir.path('')));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('watch', ['lint', 'babel'], () => {
  gulp.watch(srcDir.path('**/*.js'), ['lint', 'babel']);
  gulp.watch(
      _.map(paths.copyFromAppDir, (v) => srcDir.path(v)),
      ['copy']);
  gulp.watch('bower.json', ['wiredep']);
});

gulp.task('size', () => {
  return gulp.src(destDir.path('**/*')).pipe($.size({title: 'build', gzip: true}));
});

gulp.task('wiredep', () => {
  gulp.src(srcDir.path('*.html'))
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest(srcDir.path('.')));
});

gulp.task('package', function () {
  var manifest = require('./dist/manifest.json');
  return gulp.src(destDir.path('**'))
      .pipe($.zip('CacheBrowser-' + manifest.version + '.zip'))
      .pipe(gulp.dest('package'));
});

gulp.task('build', (cb) => {
  runSequence(
    'lint', 'babel',
    ['copy'],
    'size', cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
