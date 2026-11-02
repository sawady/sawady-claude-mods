#!/usr/bin/env bash
# Status line de Claude Code: carpeta, git, contexto, RAM, CPU, docker.
# Recibe por stdin el JSON de la sesión que manda Claude Code.

input=$(cat)
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/claude-statusline"
mkdir -p "$CACHE"

C_RESET=$'\e[0m'; C_DIM=$'\e[2m'
C_BLUE=$'\e[34m'; C_GREEN=$'\e[32m'; C_YELLOW=$'\e[33m'; C_RED=$'\e[31m'; C_CYAN=$'\e[36m'; C_MAGENTA=$'\e[35m'
SEP=" ${C_DIM}│${C_RESET} "

# Verde < warn, amarillo < crit, rojo >= crit
level_color() { # valor warn crit
  if (( $1 >= $3 )); then printf %s "$C_RED"
  elif (( $1 >= $2 )); then printf %s "$C_YELLOW"
  else printf %s "$C_GREEN"; fi
}

# --- Datos de la sesión ---
cwd=$(jq -r '.workspace.current_dir // .cwd // empty' <<<"$input")
[[ -z $cwd ]] && cwd=$PWD
model=$(jq -r '.model.display_name // empty' <<<"$input")
effort=$(jq -r '.effort.level // empty' <<<"$input")

# --- Carpeta ---
dir=${cwd/#$HOME/\~}
out="${C_BLUE}📁 ${dir}${C_RESET}"

# --- Git ---
if git_status=$(git -C "$cwd" --no-optional-locks status --porcelain=v2 --branch 2>/dev/null); then
  branch=$(awk '/^# branch.head/ {print $3}' <<<"$git_status")
  [[ $branch == "(detached)" ]] && branch="@$(awk '/^# branch.oid/ {print substr($3,1,7)}' <<<"$git_status")"
  read -r ahead behind < <(awk '/^# branch.ab/ {gsub(/[+-]/,""); print $3, $4}' <<<"$git_status")
  changes=$(grep -vc '^#' <<<"$git_status")
  g="🌿 ${branch}"
  (( changes > 0 )) && g+=" ${C_YELLOW}●${changes}${C_MAGENTA}"
  (( ${ahead:-0} > 0 )) && g+=" ↑${ahead}"
  (( ${behind:-0} > 0 )) && g+=" ↓${behind}"
  out+="${SEP}${C_MAGENTA}${g}${C_RESET}"
fi

# --- Contexto ---
# 1234 -> 1.2k, 420000 -> 420k, 1000000 -> 1M
fmt_tokens() {
  awk -v n="$1" 'BEGIN {
    if (n >= 1000000) { s = sprintf("%.1f", n/1000000); sub(/\.0$/, "", s); print s "M" }
    else if (n >= 10000) printf "%dk\n", n/1000
    else if (n >= 1000) { s = sprintf("%.1f", n/1000); sub(/\.0$/, "", s); print s "k" }
    else print n
  }'
}
read -r ctx_used ctx_tokens ctx_size < <(jq -r '
  .context_window as $c
  | ($c.context_window_size // 0) as $size
  | (if $c.current_usage != null then
       ($c.current_usage.input_tokens // 0) + ($c.current_usage.cache_creation_input_tokens // 0)
       + ($c.current_usage.cache_read_input_tokens // 0)
     else null end) as $tok
  | (if $c.used_percentage != null then $c.used_percentage
     elif ($tok != null and $size > 0) then $tok * 100 / $size
     else null end) as $pct
  | if $pct == null then empty
    else [($pct | floor), ($tok // ($pct * $size / 100) | floor), $size] | @tsv end' <<<"$input" 2>/dev/null)
if [[ -n $ctx_used ]]; then
  ctx_label="🧠 ctx ${ctx_used}%"
  (( ctx_size > 0 )) && ctx_label+=" · $(fmt_tokens "$ctx_tokens")/$(fmt_tokens "$ctx_size")"
  out+="${SEP}$(level_color "$ctx_used" 60 85)${ctx_label}${C_RESET}"
else
  out+="${SEP}${C_DIM}🧠 ctx --${C_RESET}"
fi

# --- Modelo y esfuerzo ---
if [[ -n $model ]]; then
  m="🤖 ${model}"
  [[ -n $effort ]] && m+=" · ${effort}"
  out+="${SEP}${C_CYAN}${m}${C_RESET}"
fi

# --- Límites de uso: % usado de la ventana de 5h y de 7 días ---
read -r rl_5h rl_7d < <(jq -r '[(.rate_limits.five_hour.used_percentage // "-"), (.rate_limits.seven_day.used_percentage // "-")]
  | map(if . == "-" then . else floor end) | @tsv' <<<"$input" 2>/dev/null)
rl=""
for pair in "5h:$rl_5h" "7d:$rl_7d"; do
  name=${pair%%:*}; used=${pair#*:}
  [[ -z $used || $used == "-" ]] && continue
  [[ -n $rl ]] && rl+="${C_DIM} · ${C_RESET}"
  rl+="$(level_color "$used" 70 90)${name} ${used}%${C_RESET}"
done
[[ -n $rl ]] && out+="${SEP}⏳ ${rl} ${C_DIM}usado${C_RESET}"

# --- RAM ---
read -r mem_total mem_avail < <(awk '/^MemTotal/ {t=$2} /^MemAvailable/ {a=$2} END {print t, a}' /proc/meminfo)
if (( mem_total > 0 )); then
  mem_used_pct=$(( (mem_total - mem_avail) * 100 / mem_total ))
  mem_free_gb=$(awk -v a="$mem_avail" 'BEGIN {printf "%.1f", a/1048576}')
  mem_total_gb=$(awk -v t="$mem_total" 'BEGIN {printf "%.0f", t/1048576}')
  out+="${SEP}$(level_color "$mem_used_pct" 70 90)💾 ${mem_free_gb}/${mem_total_gb}G libre${C_RESET}"
fi

# --- CPU: diferencia contra la muestra anterior guardada en caché (sin sleep) ---
read -r _ u n s idle iow irq sirq steal _ < /proc/stat
cpu_total=$((u + n + s + idle + iow + irq + sirq + steal))
cpu_idle=$((idle + iow))
if [[ -f $CACHE/cpu ]]; then
  read -r prev_total prev_idle < "$CACHE/cpu"
  dt=$((cpu_total - prev_total)); di=$((cpu_idle - prev_idle))
  (( dt > 0 )) && cpu_pct=$(( (dt - di) * 100 / dt ))
fi
echo "$cpu_total $cpu_idle" > "$CACHE/cpu"
if [[ -n $cpu_pct ]]; then
  out+="${SEP}$(level_color "$cpu_pct" 60 85)⚙️  CPU ${cpu_pct}% ($(nproc) cores)${C_RESET}"
fi

# --- Docker (cacheado 5s para no trabar la barra) ---
if command -v docker >/dev/null; then
  dcache=$CACHE/docker
  if [[ ! -f $dcache ]] || (( $(date +%s) - $(stat -c %Y "$dcache") > 5 )); then
    if ids=$(timeout 1 docker ps -q 2>/dev/null); then
      echo "up $(grep -c . <<<"$ids")" > "$dcache"
    else
      echo "down" > "$dcache"
    fi
  fi
  read -r dstate dcount < "$dcache"
  if [[ $dstate == up ]]; then
    out+="${SEP}${C_CYAN}🐳 ${dcount} up${C_RESET}"
  else
    out+="${SEP}${C_DIM}🐳 off${C_RESET}"
  fi
fi

printf '%s\n' "$out"
