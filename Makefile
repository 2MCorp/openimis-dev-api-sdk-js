default: build

.PHONY: install clean typecheck build pack

install:
	pnpm install

clean:
	pnpm run clean

typecheck:
	pnpm run typecheck

build:
	pnpm run build

pack:
	pnpm run pack
