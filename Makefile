NODEPATH ?= "./node_modules"
JS_UGLIFY = $(NODEPATH)/uglify-js2/bin/uglifyjs2
JS_TESTER = $(NODEPATH)/vows/bin/vows

JS_FILES = \
	clues.js

all: \
	$(JS_FILES) \
	$(JS_FILES:.js=.min.js)

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_UGLIFY) $< -c --comments -m -o $@

test: all
	@$(JS_TESTER)