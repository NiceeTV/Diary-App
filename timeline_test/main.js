const ciara2 = document.getElementById("ciara2");
const ciara1 = document.getElementById("ciara1");
const main_line = document.getElementById('main_line');
const timeline = document.getElementById('timeline');

ciara1.style.left = '10.5%'; /* 2.5% + odsun */
ciara2.style.left = '22.5%'; /* 2.5% + odsun */

let new_event = false;
let last_line_perc = 0;

main_line.addEventListener("click", e => {
    const target = e.target;
    target_rect = target.getBoundingClientRect();

    const timelineRect = timeline.getBoundingClientRect();
    
    // 2. Presný offset od ľavého okraja timeline
    const offset = e.clientX - timelineRect.left;
    const width = timelineRect.width;
    
    // 3. Percento (0% = úplne vľavo, 100% = úplne vpravo)
    let perc = (offset / width) * 100;
    
    // 4. Obmedzenie na rozsah (0-100%)
    perc = Math.min(100, Math.max(0, perc));

    /* vypočet timestampu */
    const sec = 86400 / 100 * perc;
    const hours = parseInt((sec / 3600));

    const remainder = hours * 3600;
    let minutes = parseInt((sec - remainder) / 60);

    console.log(hours, minutes);

    const stamp = document.createElement('div');
    stamp.className = "main_timestamp";
    stamp.style.left = `${perc - 1}%`;

    if (minutes < 10) {
        minutes = `0${minutes}`;
    }

    /* stamp + line */
    stamp.innerHTML = `
        <div class="time_stamp">${hours}:${minutes}</div>
    `

    timeline.appendChild(stamp);
    


    console.log('click',e);
    console.log('offset x', e.offsetX, e.target.offsetWidth);

    const el = document.createElement("div");
    el.className = "vertical-line";

    //const perc = offset / width * 100;
    console.log('perc', perc);
    el.style.left = `${perc}%`;
    timeline.appendChild(el);   

    if (new_event) {
        /* pridaj fill medzi ne */
        const fill = document.createElement("div");
        fill.className = "line_fill";
        const fill_width = Math.abs(perc - last_line_perc); 

        fill.style.left = `${last_line_perc}%`;
        fill.style.width = `${fill_width}%`;
        timeline.appendChild(fill);   
        new_event = false;
    }
    else {
        last_line_perc = perc;
        new_event = true;
    }
})


