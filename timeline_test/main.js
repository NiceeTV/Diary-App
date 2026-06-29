const main_line = document.getElementById('main_line');
const timeline = document.getElementById('timeline');
let new_event = false;
let last_line_perc = 0;
let last_cont = null; /* kontajner pre event */
let last_color = null; /* ktorú farbu používame teraz */
let is_hover = false; /* ci hoverujeme nad hlavnou ciarou */

/* timeline a tooltip rect */
let timelineRect = timeline.getBoundingClientRect();
let tooltipRect = null;

/* farby */
let currentIndex = 0;


const baseColors = [
    { name: 'Modrá', rgb: 'rgb(137, 180, 250)', hex: '#89b4fa' },
    { name: 'Tmavšia modrá', rgb: 'rgb(70, 130, 255)', hex: '#4682ff' },
    { name: 'Zelená', rgb: 'rgb(100, 220, 140)', hex: '#64dc8c' },
    { name: 'Lesná zelená', rgb: 'rgb(60, 180, 120)', hex: '#3cb478' },
    { name: 'Žltá', rgb: 'rgb(255, 215, 80)', hex: '#ffd750' },
    { name: 'Oranžová', rgb: 'rgb(255, 170, 70)', hex: '#ffaa46' },
    { name: 'Tmavšia oranžová', rgb: 'rgb(240, 140, 50)', hex: '#f08c32' },
    { name: 'Červená', rgb: 'rgb(255, 100, 100)', hex: '#ff6464' },
    { name: 'Tmavšia červená', rgb: 'rgb(220, 60, 80)', hex: '#dc3c50' },
    { name: 'Fialová', rgb: 'rgb(190, 130, 240)', hex: '#be82f0' },
    { name: 'Ružová', rgb: 'rgb(255, 130, 200)', hex: '#ff82c8' },
    { name: 'Zlatá', rgb: 'rgb(255, 200, 50)', hex: '#ffc832' },
    { name: 'Šedá', rgb: 'rgb(180, 190, 200)', hex: '#b4bec8' }
];


function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}


function getNextColor() {
    const color = baseColors[currentIndex];
    currentIndex = (currentIndex + 1) % baseColors.length;
    return color;
}


function delete_line(target) {
    target.parentElement.parentElement.remove();
}


function init_tooltip() {
    let tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = '12:00';
    tooltip.style.position = 'absolute';
    tooltip.style.left = 0 + 'px';
    tooltip.style.top = 0 + 'px';
    tooltip.style.background = '#313244';
    tooltip.style.color = '#cdd6f4';
    tooltip.style.padding = '5px 10px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '16px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '100';
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);
    main_line._tooltip = tooltip;
}

function calc_offset_stamp(e) {
    /* offset od ľavého okraja */
    const offset = e.clientX - timelineRect.left;
    const width = timelineRect.width;
    let perc = (offset / width) * 100;

    /* čeknutie rozsahu (0-100%) */
    perc = Math.min(100, Math.max(0, perc));

    /* vypočet timestampu */
    const sec = 86400 / 100 * perc;
    const hours = parseInt((sec / 3600));
    const remainder = hours * 3600;
    let minutes = parseInt((sec - remainder) / 60);

    if (minutes < 10) {
        minutes = `0${minutes}`;
    }           

    return {perc, hours, minutes};
}


main_line.addEventListener("click", e => {
    const target = e.target;
    target_rect = target.getBoundingClientRect();
    const timelineRect = timeline.getBoundingClientRect();
    
    const res = calc_offset_stamp(e);
    const perc = res["perc"];

    /* ak už som pridal prvú čiaru eventu */
    if (new_event) {
        /* pridaj fill medzi ne */
        const fill_width = Math.abs(perc - last_line_perc); 

        /* line fill element */
        const fill = document.createElement("div");
        fill.className = "line_fill";
        fill.style.left = `calc(${Math.min(perc, last_line_perc)}% + 4px)`;
        fill.style.width = `calc(${fill_width}% - 4px)`;

        /* nastav farbu vybranu ako pozadie */
        const rgb = hexToRgb(last_color.hex);
        fill.style.background = `linear-gradient(
            to right,
            rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1),
            rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4) 50%,
            rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)
        )`;


        /* fill input */    
        const event_input = document.createElement('input');
        event_input.className = "event_input";
        event_input.type = "text";
        event_input.style.borderColor = last_color.rgb;
        event_input.style.pointerEvents = 'none';
        
        /* focus input ked kliknem na fill */
        fill.addEventListener("click", () => {event_input.focus();});

        /* hover cez vybranu farbu */
        fill.addEventListener('mouseenter', function() {
            this.style.backgroundColor  = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
        });

        /* ak odídem z fill, odfocusne sa input, odstran hover farbu */
        fill.addEventListener("mouseleave", function() {
            this.style.backgroundColor = 'transparent';
            event_input.blur();  
        });

        fill.appendChild(event_input);
        last_cont.appendChild(fill); 
        new_event = false;
    }
    else {
        last_line_perc = perc;
        new_event = true;
        last_cont = document.createElement('div');
        last_cont.className = 'event_cont';
        timeline.appendChild(last_cont);

        /* vyber farbu */
        const next_color = getNextColor();
        last_color = next_color;
    }

    /* element pre timestamp */
    const stamp = document.createElement('div');
    stamp.className = "main_timestamp";
    stamp.style.left = `${perc }%`;


    /* stamp + line */
    stamp.innerHTML = `
        <div class="time_stamp" style="left: 1.5%;">${res["hours"]}:${res["minutes"]}</div>
    `

    /* vertikálna čiara */
    const el = document.createElement("div");
    el.className = "vertical-line";
    el.style.left = `${perc}%`;
    el.style.borderColor = last_color.rgb;

    /* event na odstranenie */
    el.addEventListener('click', e => {el.parentElement.parentElement.remove();});

    /* create cont pre čiaru + stamp */
    const stamp_cont = document.createElement('div');
    stamp_cont.style.width = "fitContent";
    stamp_cont.appendChild(el);
    stamp_cont.appendChild(stamp);
    last_cont.appendChild(stamp_cont);   
})


/* tooltip on line hover */
main_line.addEventListener('mouseenter', function() {
    is_hover = true;
    if (this._tooltip) {
        timelineRect = timeline.getBoundingClientRect();
        tooltipRect = this._tooltip.getBoundingClientRect();
        this._tooltip.style.display = "block";
    }
});

main_line.addEventListener('mouseleave', function() {
    is_hover = false;
    if (this._tooltip) {
        this._tooltip.style.display = "none";
    }
});


main_line.addEventListener('mousemove', function(e) {
    if (is_hover) {
        const res = calc_offset_stamp(e);       
        this._tooltip.textContent = `${res["hours"]}:${res["minutes"]}`;
        this._tooltip.style.left = e.clientX - this._tooltip.offsetWidth / 2 + 5 + 'px';
        this._tooltip.style.top = (e.clientY + 20) + 'px';
        this._tooltip.style.display = "block";
    }
});

init_tooltip();