const entry_editor = new FroalaEditor("div#froala-editor");
const audio_btn = document.getElementById("audio_btn");
const audio_file_input = document.getElementById("fileInput");
const submit_btn = document.getElementById("submit_entry");
const checkbox = document.querySelector('.stvorec-check');
const reason_sel = document.getElementById('reason_select');
const reason_other = document.getElementById('entry_goal_reason');
const rating_colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#4ade80']; /* index = hodnotenie 1-5 */


function change_reason(checked) {
    if (checked) {
        console.log('✅ Checkbox je ZAŠKRTNUTÝ');
        reason_sel.style.display = "none";
    } else {
        console.log('❌ Checkbox je ODŠKRTNUTÝ');
        reason_sel.style.display = "block";
    }
}

function init_ratings() {
    const rating_inputs = document.querySelectorAll(".mood_inputs input");
    rating_inputs.forEach(input => {
        const inp_val = input.value ? input.value : 1;
        input.style.backgroundColor = rating_colors[inp_val-1];

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
    })
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
submit_btn.addEventListener("click", () => {
    const title = document.getElementById("entry_title_text");

    /* today stats */
    const today_entries = document.getElementById("today_stats");

    console.log('wat',today_entries.children);

    if (today_entries) {
        Array.from(today_entries.children).forEach(child => {
            const type = child.dataset.value;
            const inp = child.querySelector(".stats_input");

            console.log('inp',inp);
            if (inp) {
                const val = inp.value;
                            console.log('today stats',type, val);

            }
        
            
        })

    }







})


/* init */
change_reason(reason_sel.checked);
init_ratings();