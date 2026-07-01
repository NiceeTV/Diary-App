const entry_editor = new FroalaEditor("div#froala-editor");
const audio_btn = document.getElementById("audio_btn");
const audio_file_input = document.getElementById("fileInput");
const submit_btn = document.getElementById("submit_entry");
const delete_btn = document.getElementById("delete_entry");
const checkbox = document.querySelector('.stvorec-check');
const reason_sel = document.getElementById('reason_select');
const reason_other = document.getElementById('entry_goal_reason');
const rating_colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#4ade80']; /* index = hodnotenie 1-5 */

/* sidebar */
const sidebar = document.getElementById("sidebar");
let add_btn = null;
let active_el = null;

/* entry elements */
const title = document.getElementById("entry_title_text");
const today_entries = document.getElementById("today_stats");
const moods_cont = document.querySelector(".moods");
const goal_inp = document.getElementById("goal");
const check = document.querySelector(".stvorec-check");
const select_reason = document.getElementById("reason_select");
const dovod = document.getElementById("entry_goal_reason");
const reflexia = document.getElementById("entry_reflection");
let loaded_entries = [];


function change_reason(checked) {
    if (checked) {
        /* ukáž select */
        reason_sel.style.display = "none";
    } else {
        /* skry select */
        reason_sel.style.display = "block";
    }
}

function init_ratings(update=false) {
    const rating_inputs = document.querySelectorAll(".mood_inputs input");
    rating_inputs.forEach(input => {
        const inp_val = input.value ? input.value : 1;
        input.style.backgroundColor = rating_colors[inp_val-1];

        if (!update) {
            /* zmena hodnoty kolieskom myši */
            input.addEventListener('wheel', function(e) {
                e.preventDefault(); /* aby sa stránka neskrolovala */
                e.stopPropagation()

                const smer = e.deltaY;
                if (smer > 0) { /* smer dole, odčítaj */
                    this.value = parseInt(this.value) - 1;
                }
                else { /* smer hore, pripočítaj */
                    this.value = parseInt(this.value) + 1;
                }

                /* ohraničenie */
                let new_val = Math.min(5, Math.max(1, this.value));
                if (new_val !== this.value) {
                    this.value = new_val;
                }

                input.style.backgroundColor = rating_colors[this.value-1];

            }, { passive: false });
        }
    })
}


function clear_entry() {
    /* potrebujeme clearnut všetky inputy */
    if (loaded_entries.length > 0) {
        /* najnovší entry */
        const latest_entry = loaded_entries[0];
        const latest_date = latest_entry["date"];
        const date = new Date(latest_date);
        date.setDate(date.getDate() + 1);

        /* pridáme 1 deň do najnovšieho dátumu */
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const next_date = `${day}/${month}/${year}`;

        /* extrahujeme číslo dňa z formátu (Deň XXX. - XX/XX/XXXX) */
        const match = latest_entry["title"].match(/Deň\s+(\d+)\./);
        const day_num = match ? parseInt(match[1]) : 0;
        const new_title = `Deň ${day_num+1}. - ${next_date}`;

        /* nastavenie noveho title */
        title.value = new_title;

        /* clearneme week_stats, today_stats */
        const all_stats_inputs = document.querySelectorAll(".stats_input");
        all_stats_inputs.forEach(input => {input.value = "0:00"; input.setAttribute('value', '0:00');});

        /* reset moodov na 5 */
        const all_mood_inputs = document.querySelectorAll(".mood_inputs input");
        all_mood_inputs.forEach(input => {input.value = "5"; input.setAttribute('value', '5');})
        init_ratings(true); /* obnov farby */

        /* vymazať ciel, odchecknut checkmark a vymazať dôvod */
        goal_inp.value = "";
        goal_inp.setAttribute('value', '');

        check.checked = false;
        change_reason(false);

        /* select dáme na jeho prvú option */
        select_reason.value = select_reason.options[0].value;

        /* dôvod */
        reason_other.value = "";
        reason_other.style.display = "none";

        /* vymaž timeline */
        clear_timeline();

        /* diary a reflexia */
        if (entry_editor) {
            entry_editor.html.set("");
        }

        /* reflexia */
        if (reflexia) {
            reflexia.value = "";
        }
    }
}


function render_entry(entry) {
    clear_entry();

    if (title) {
        title.value = entry["title"];
    }

    const mood = ["rano_score", "vecer_score", "spanok_score", "energia_score"];
    mood.forEach(m => {
        const mood_el = moods_cont.querySelector(`input[name="${m}"]`);
        if (mood_el) {
            mood_el.value = entry[m];
        }
    })
    
    init_ratings(true);
    
    /* today stats z toho dňa */
    const stats = ["wakeup_time", "sleep_time", "screen_time"];

    /* premeniť screen time späť na HH_MM */
    const screen = parseInt(entry["screen_time"]);
    const h = parseInt(screen / 60);
    const r = screen - h*60;
    entry["screen_time"] = `${h}:${r}`;

    stats.forEach(s => {
        const stat_el = today_entries.querySelector(`input[name="${s}"]`);
        console.log("stat",stat_el);
        if (stat_el) {
            stat_el.value = entry[s];
        }
    })


        
    /* week stats TODO */
    

    /* goal */
    if (goal_inp) {
        console.log('goal:',goal_inp.value);
        goal_inp.value = entry["goal"];
    }

    /* goal checkmark */
    if (check) {
        check.checked = entry["goal_completed"] ? true : false;
        change_reason(check.checked);

        if (check.checked === false) {

            if (select_reason) {
                select_reason.value = entry["goal_reason"];
                if (entry["goal_reason"] === "other") {
                    /* ukaž dovod */
                    dovod.value = entry["goal_reason_other"];
                    reason_other.style.display = "block";
                }
                else {
                    reason_other.style.display = "none";
                }
            }
        }
    }


    /* timeline */
    const parsed_events = JSON.parse(entry["events"]);
    parsed_events.forEach(event => {
        add_from_event(event);
    })
 

    /* zápis do denníka */
    if (entry_editor) {
        entry_editor.html.set(entry["diary"]);
    }

    /* reflexia */
    if (reflexia) {
        console.log('reflexia', reflexia.value);
        reflexia.value = entry["reflexia"];
    }
}


/* načítaj denníkové záznamy */
async function loadSidebar() {
    try {
        const response = await fetch('/entries');
        const entries = await response.json();
        loaded_entries = [];
        
        console.log("response",response);
        console.log('entires',entries);


        entries.forEach((entry, index) => {
            const sidebar_item = document.createElement("div");
            sidebar_item.className = "sidebar_item";
            sidebar_item.innerHTML = 
            `
                <span class="sidebar_text" title="${entry["title"]}">${entry["title"]}</span>
                <div class="sidebar_icon">${entry["goal_completed"] ? '✅' : '❌'}</div>
            `;

            let entry_id = entry["id"] || 0;
            sidebar_item.dataset.entry_id = entry_id;
            sidebar_item.addEventListener("click", async () => {
                const response = await fetch(`/entry/${entry_id}`);
                const entry = await response.json();
                console.log('resp',entry);
                render_entry(entry);

                if (active_el) {
                    active_el.classList.remove('active');
                    active_el = sidebar_item; 
                }
                sidebar_item.classList.add('active')
            })

            if (index === 0) { 
                sidebar_item.classList.add('active')
                active_el = sidebar_item;    
                setTimeout(() => sidebar_item.click(), 100);
            }

            loaded_entries.push(entry);
            sidebar.appendChild(sidebar_item);
        })

        console.log('en',loaded_entries);

        /* pridame add button */
        add_btn = document.createElement('div');
        add_btn.id = "sidebar_add";
        add_btn.innerHTML = `
            <span class="sidebar_text">Add New</span>
        `;

        add_btn.addEventListener("click", () => {
            clear_entry();

            active_el.classList.remove("active");
            add_btn.classList.add("active");
            active_el = add_btn;
        });
            
        sidebar.appendChild(add_btn);
    } catch (error) {
        console.error('❌ Chyba:', error);
    }
}


/* audio buttony a srandy */
audio_btn.addEventListener("click", () => {
    audio_file_input.click();
    console.log('audio', audio_file_input);
})

audio_file_input.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        console.log('Vybratý súbor:', file);        
    }
});

checkbox.addEventListener('change', function() {
    if (this.checked) {
        console.log('✅ Checkbox je ZAŠKRTNUTÝ');
        reason_sel.style.display = "none";

        const other_style = window.getComputedStyle(reason_other);
        if (other_style.getPropertyValue('display') === "block") {
            reason_other.style.display = "none";
        }

    } else {
        console.log('❌ Checkbox je ODŠKRTNUTÝ');
        reason_sel.style.display = "block";

        if (reason_sel.value === "other") {
            reason_other.style.display = "block";
        }
    }
});

reason_sel.addEventListener('change', function() {
    console.log(this.value);
    if (this.value === "other") {
        /* ukáž dôvod */
        reason_other.style.display = "block";
    }
    else {
        /* skry dôvod */
        reason_other.style.display = "none";
    }
});



/* submit btn */
submit_btn.addEventListener("click", async (e) => {
    e.preventDefault();
    const title = document.getElementById("entry_title_text");

    const dateMatch = title.value.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    let datum = new Date().toISOString().split('T')[0];
    if (dateMatch) {
        /* DD/MM/YYYY */
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3]);
        datum = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    /* today stats */
    const stat_inputs = today_entries.querySelectorAll(".stats_input");
    const tostats = {}
    if (stat_inputs) {
        stat_inputs.forEach(stat => {
            const type = stat.name;
            const val = stat.value;
            tostats[type] = val;
        })
    }

    /* today moods */
    const rating_inputs = document.querySelectorAll(".mood_inputs input");
    const moods = {}
    if (rating_inputs) {
        rating_inputs.forEach(input => {
            moods[input.name] = input.value;
        });
    }

    /* goal */
    const goal_inp = document.getElementById("goal");
    if (goal_inp) {
        console.log('goal:',goal_inp.value);
    }

    /* goal checkmark */
    const check = document.querySelector(".stvorec-check");
    const is_checked = check && check.checked;
    console.log('check', is_checked);

    let reason = "";
    if (!is_checked) {
        /* pozri dôvod */
        const select_reason = document.getElementById("reason_select");
        console.log('teraz value', select_reason.value);
    }

    /* timeline */
    console.log('events', events);

    /* zápis do denníka */
    console.log('diary',entry_editor.html.get());

    /* reflexia */
    const reflexia = document.getElementById("entry_reflection");
    if (reflexia) {
        console.log('reflexia', reflexia.value);
    }


    console.log('cat times',calculateCategoryTime(events));
    const now = new Date().toISOString().split('T')[0];

    const data = {
        title: title?.value || "Neznámy názov",
        date: datum || new Date().toISOString().split('T')[0],
        today_stats: tostats,
        mood: moods,
        goal: goal_inp?.value?.trim() || "Žiadny cieľ",
        goal_completed: is_checked,
        goal_reason: select_reason?.value || "other",
        goal_reason_other: dovod?.value || "",
        events: events || [],
        category_times: calculateCategoryTime(events) || {},
        diary: entry_editor.html.get() || "",
        reflexia: reflexia?.value || ""
    }

    console.log('data',data);

    /* pošli data na backend */
    try {
        const response = await fetch('/entry_save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
        const result = await response.json();
        console.log('✅ Odpoveď:', result);
        
        if (result.success) {
            alert('Denník bol úspešne uložený!');

            /* reloadni sidebar */
            sidebar.innerHTML = '';
            loadSidebar();
        } else {
            alert('❌ Chyba pri ukladaní: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Chyba pri odosielaní:', error);
        alert('❌ Nastala chyba pri odosielaní dát.');
    }
})


delete_btn.addEventListener("click", async (e) => {
    if (active_el && active_el.id === "sidebar_add") {
        alert("You can't delete a new entry.");
        return;
    }
    else {
        const id_to_del = active_el.dataset.entry_id;

        try {
            const response = await fetch(`/entry_delete/${id_to_del}`);
            
            const result = await response.json();
            console.log('✅ Odpoveď:', result);
            
            if (result.success) {
                alert('✅ Denník bol úspešne vymazaný!');

                /* vymaž zo sidebaru a otvor najnovší ak nie je otvorený */
                const sidebar_item_to_del = sidebar.querySelector(`[data-entry_id="${id_to_del}"]`);
                console.log('sidebar del',sidebar_item_to_del);

                sidebar_item_to_del.remove();

                /* odstranit z loaded entries */

                /* vybrat najnovsieho z loaded entries */
                loaded_entries = loaded_entries.filter(item => item["id"] !== parseInt(id_to_del));

                console.log('new loaded', loaded_entries);
                const latest_id = loaded_entries[0]["id"];
                if (loaded_entries.length > 0 && latest_id) {
                    /* oznac za active */
                    const latest_html_sidebar = sidebar.children[0];
                    latest_html_sidebar.classList.add('active')
                    active_el = latest_html_sidebar;    
                    setTimeout(() => latest_html_sidebar.click(), 100);
                }
            } else {
                alert('❌ Chyba pri ukladaní: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Chyba pri odosielaní:', error);
            alert('❌ Nastala chyba pri odosielaní dát.');
        }
    }
});

/* init */
change_reason(reason_sel.checked);
loadSidebar();
init_ratings(false);