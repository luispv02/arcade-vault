#!/usr/bin/env bash
# PostToolUse hook: en el archivo creado/editado elimina las líneas en blanco,
# aplica Prettier y corrige con ESLint (--fix).
input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"

[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in "$root"/*) ;; *) exit 0 ;; esac

cd "$root" || exit 0

strip_blank_lines() {
  case "$file" in
    *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs|*.css)
      tmp=$(mktemp) && sed '/^[[:space:]]*$/d' "$file" >"$tmp" && cat "$tmp" >"$file"
      rm -f "$tmp"
      ;;
  esac
}

strip_blank_lines
npx --no-install prettier --write --ignore-unknown "$file" >/dev/null 2>&1
strip_blank_lines

case "$file" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
    if ! out=$(npx --no-install eslint --fix --no-warn-ignored "$file" 2>&1); then
      printf 'ESLint encontró errores en %s:\n%s\n' "$file" "$out" >&2
      exit 2
    fi
    strip_blank_lines
    ;;
esac
exit 0
