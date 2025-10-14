(() => {
    document.addEventListener('DOMContentLoaded', () => {

        /** 正则常量 */
        const LINE_RE = /\[(\d+:\d+\.\d+)\](.*)/;
        const TIME_RE = /\[(\d+):(\d+(?:\.\d+)?)\]/;
        const INFO_RE = {
            album: /\[al:(.*)\]/,
            artist: /\[ar:(.*)\]/,
            title: /\[ti:(.*)\]/
        };

        /** 读取 URL hash 并构造资源路径 */
        const filename = location.hash.slice(1).split('?')[0];
        if (!filename) {
            window.location.href = "book.html"
        }
        const book = filename.split('/').shift()
        const bookScr = `book.html#${book}`;
        const bookImgSrc = `images/${book}.jpg`;
        const mp3Src = `${filename}.mp3`;
        const lrcSrc = `${filename}.lrc`;

        /** DOM 引用 */
        const audio = document.getElementById('player');
        const content = document.getElementById('content');
        const bookEl = document.getElementById('book');
        const bookTitleEl = document.getElementById('book-title');
        const bookImgEl = document.getElementById('book-img');
        const lessonTitleEl = document.getElementById('lesson-title');
        const loopBtnEl = document.getElementById('loop-btn');
        const nextBtnEl = document.getElementById('next-btn');

        /** 数据结构 */
        const state = {
            data: [],          // [{en, cn, start, end}]
            album: '',
            artist: '',
            title: '',
            segmentEnd: 0,
            activeIdx: -1,
            isSingleLoop: false
        };

        audio.src = mp3Src;
        bookImgEl.src = bookImgSrc;
        bookImgEl.alt = book;

        /** -------------------------------------------------
         *  元信息解析
         * ------------------------------------------------- */
        function parseInfo(line) {
            for (const key in INFO_RE) {
                const m = line.match(INFO_RE[key]);
                if (m) state[key] = m[1];
            }
        }

        /** -------------------------------------------------
         *  时间解析
         * ------------------------------------------------- */
        function parseTime(tag) {
            const m = TIME_RE.exec(tag);
            return m ? parseInt(m[1], 10) * 60 + parseFloat(m[2]) -0.5 : 0;
        }

        /** -------------------------------------------------
         *  LRC 解析
         * ------------------------------------------------- */
        async function loadLrc() {
            const lrcRes = await fetch(lrcSrc);
            const text = await lrcRes.text();
            const lines = text.split(/\r?\n/).filter(Boolean);

            lines.forEach((raw, i) => {
                const line = raw.trim();
                const match = line.match(LINE_RE);

                if (!match) {
                    parseInfo(line);
                    return;
                }

                const start = parseTime(`[${match[1]}]`);
                const [en, cn = ''] = match[2].split('|').map(s => s.trim());

                let end = 0;
                for (let j = i + 1; j < lines.length; j++) {
                    const nxt = lines[j].match(LINE_RE);
                    if (nxt) {
                        end = parseTime(`[${nxt[1]}]`);
                        break;
                    }
                }
                state.data.push({en, cn, start, end});
            });
            render();
        }


        /** -------------------------------------------------
         *  渲染
         * ------------------------------------------------- */
        function render() {
            bookEl.href = bookScr;
            bookTitleEl.textContent = state.album;
            lessonTitleEl.textContent = state.title;

            content.innerHTML = state.data.map(
                (item, idx) =>
                    `<div class="sentence" data-idx="${idx}">
                    <div class="en">${item.en}</div>
                    <div class="cn">${item.cn}</div>
                </div>`
            ).join('');
        }

        /** -------------------------------------------------
         *  播放区间
         * ------------------------------------------------- */
        function playSegment(start, end) {
            state.segmentEnd = end
            audio.currentTime = start;
            audio.play();
            state.activeIdx = -1;
        }

        /** -------------------------------------------------
         *  高亮 & 自动滚动
         * ------------------------------------------------- */
        function highlight(idx) {
            if (idx === state.activeIdx) return;
            const prev = content.querySelector('.sentence.active');
            if (prev) prev.classList.remove('active');
			const cur = content.querySelector(`.sentence[data-idx="${idx === -1 ? 0 : idx}"]`);
			if (cur) {
				idx !== -1 && cur.classList.add('active');
				cur.scrollIntoView({behavior: 'smooth', block: 'center'});
			}
            state.activeIdx = idx;
        }

        /** -------------------------------------------------
         *  事件绑定（委托）
         * ------------------------------------------------- */
        content.addEventListener('click', e => {
            const target = e.target.closest('.sentence');
            if (!target) return;
            const idx = Number(target.dataset.idx);
            const {start, end} = state.data[idx];
            playSegment(start, end);
        });

        audio.addEventListener('timeupdate', () => {
            const cur = audio.currentTime;
            // 区间结束自动暂停
            if (state.segmentEnd && cur >= state.segmentEnd) {
                audio.pause();
                audio.currentTime = state.segmentEnd;
                state.segmentEnd = 0;
                state.activeIdx = -1;
                return;
            }

            // 找到当前句子索引
            const idx = state.data.findIndex(
                item => cur > item.start && (cur < item.end || !item.end)
            );
            if (idx !== -1) highlight(idx);
        });


        loopBtnEl.addEventListener('click', () => {
            state.isSingleLoop = !state.isSingleLoop;
            loopBtnEl.title = state.isLooping ? '单曲循环' : '列表播放';
            
            // 更新按钮图标
            const svg = loopBtnEl.querySelector('svg');
            if (state.isSingleLoop) {
                // 单曲循环图标
                svg.innerHTML = `
                    <path d="M507.008 122.752a42.666667 42.666667 0 0 0-30.165333 72.832l17.749333 17.749333H383.317333A298.666667 298.666667 0 0 0 232.533333 769.834667a42.666667 42.666667 0 1 0 44.672-72.149334q-23.808-13.909333-44.714666-34.816Q169.984 600.32 169.984 512q0-88.362667 62.506667-150.869333Q294.954667 298.666667 383.317333 298.666667H597.333333a42.666667 42.666667 0 0 0 30.336-12.586667 42.666667 42.666667 0 0 0 0-60.330667l-12.373333-12.373333h25.301333L639.317333 213.333333h-24.064l-78.08-78.08a42.666667 42.666667 0 0 0-30.165333-12.501333zM937.984 512c0-110.506667-59.946667-206.933333-149.12-258.56a42.666667 42.666667 0 1 0-39.424 75.264q21.589333 13.269333 40.746667 32.426667Q852.650667 423.68 852.650667 512q0 88.362667-62.464 150.869333Q727.68 725.333333 639.317333 725.333333h-209.066666a42.666667 42.666667 0 0 0-33.621334 12.373334l-0.512 0.512a42.666667 42.666667 0 0 0 3.370667 62.677333l87.637333 87.637333a42.666667 42.666667 0 0 0 60.373334-60.330666l-17.536-17.493334h109.354666a298.666667 298.666667 0 0 0 298.666667-298.709333z" p-id="4937"></path>
                    <path d="M469.333333 597.333333v-170.666666a42.666667 42.666667 0 1 1 85.333334 0v170.666666a42.666667 42.666667 0 0 1-85.333334 0z" p-id="4938"></path>
                `;
            } else {
                // 列表播放图标
                svg.innerHTML = `
                    <path d="M721.493333 212.992l0.213334-63.786667a21.418667 21.418667 0 0 1 12.16-19.328 21.077333 21.077333 0 0 1 22.613333 2.901334l174.549333 127.829333a21.333333 21.333333 0 0 1-13.610666 37.717333H85.333333v-85.333333h636.16zM85.333333 810.453333l853.333334-0.213333v85.333333l-853.333334 0.256v-85.333333z m0-298.709333h853.077334v85.333333H85.333333v-85.333333z" p-id="9841"></path>
                `;
            }
        });

        audio.addEventListener('ended', () => {
            if (state.isSingleLoop) {
				state.segmentEnd = 0;
				highlight(-1)
                audio.play();
            } else {
                window.location.href = `lesson.html#NCE${state.nextLesson.book}/${state.nextLesson.lesson}`;
            }
        });

        loadData().then((data) => {
            const [book, lesson] = decodeURIComponent(window.location.href.split("#").pop()).split("/")
            let bookIndex = book.replace("NCE", "");
            let lessonIndex = data[bookIndex].findIndex(item => item.filename === lesson);
            if (lessonIndex === data[bookIndex].length - 1) {
                bookIndex++;
                lessonIndex = 0;
            } else {
                lessonIndex++;
            }
            
            state.nextLesson = {
                book: bookIndex,
                lesson: data[bookIndex][lessonIndex].filename
            };

            nextBtnEl.disabled = false;
        })

        nextBtnEl.addEventListener('click', () => {
            window.location.href = `lesson.html#NCE${state.nextLesson.book}/${state.nextLesson.lesson}`;
        });

        async function loadData() {
            const dataSrc = 'static/data.json';
            const dataRes = await fetch(dataSrc);
            lessonsData = await dataRes.json();
            return lessonsData;
        }

        // 初始化
        loadLrc().then(r => {
        });

    })
})();