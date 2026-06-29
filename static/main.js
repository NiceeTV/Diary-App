const entry_editor = new FroalaEditor("div#froala-editor");

const audio_btn = document.getElementById("audio_btn");
const audio_file_input = document.getElementById("fileInput");

const checkbox = document.querySelector('.stvorec-check');
const reason_sel = document.getElementById('reason_select');
const reason_other = document.getElementById('entry_goal_reason');


function change_reason(checked) {
    if (checked) {
        console.log('✅ Checkbox je ZAŠKRTNUTÝ');
        reason_sel.style.display = "none";
    } else {
        console.log('❌ Checkbox je ODŠKRTNUTÝ');
        reason_sel.style.display = "block";
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


/* init */
change_reason(reason_sel.checked);