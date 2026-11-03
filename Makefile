.PHONY: dev build serve clean
dev: build serve
build:
	cd rust-webgl && wasm-pack build --target web
serve:
	npx serve .