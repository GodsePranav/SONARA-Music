
let currentSong = new Audio();

// Prevent any unintended form submissions that could cause a page reload
document.addEventListener('submit', (e) => {
  e.preventDefault();
});
const play = document.getElementById('play');
const previous = document.getElementById('previous');
const next = document.getElementById('next');
let folder = "/Songs/ncs";
let currfolder = folder;
let Songs;
let currentIndex = 0; // Track current song index


function secondsToMinutes(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00'
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

async function getSongs(folder) {
  let a = await fetch(`http://127.0.0.1:3000/Projects/Spotify%20Clone/${folder}/`)
  let response = await a.text()


  let div = document.createElement('div')

  div.innerHTML = response
  let as = div.getElementsByTagName('a')

  let Songs = []
  for (let index = 0; index < as.length; index++) {
    let href = as[index].getAttribute('href')

    if (!href) continue

    href = decodeURIComponent(href)

    // Convert Windows backslashes to URL slashes
    href = href.replace(/\\/g, '/')

    // Keep only mp3 files
    if (href.endsWith('.mp3')) {
      // If the server returns an absolute Windows path
      if (href.includes('/Songs/')) {
        href = href.substring(href.indexOf('/Songs/'))
      }

      // Build the correct URL
      let songUrl = 'http://127.0.0.1:3000/Projects/Spotify%20Clone' + href

      Songs.push(songUrl.split(`${folder}`)[1])
    }
  }
  return Songs
}  




//Play and Pause Button 
const playMusic = (track, pause = false) => {
  currentSong.src = track
  if(!pause){
    currentSong.play()
    // audio.pause()
    play.innerHTML = `
          <svg
                data-encore-id="icon"
                role="img"
                aria-hidden="true"
                class="e-10451-icon"
                viewBox="0 0 24 24"
                width="32"
                height="32"
                >
                <!-- White Background -->
                <circle cx="12" cy="12" r="12" fill="#ffffff" />
                
                <!-- Black Pause Bars -->
                <path
                d="M8 6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H8zm6 0a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2z"
                fill="#000"
          />
          </svg>
            `
    }

}




//Listen for timeupdate event
currentSong.addEventListener("timeupdate", () => {

    // Make sure duration is available
    if (!isNaN(currentSong.duration)) {

        // Current time
        document.querySelector(".time-curr").innerHTML =
            secondsToMinutes(currentSong.currentTime);

        // Full duration
        document.querySelector(".time-full").innerHTML =
            secondsToMinutes(currentSong.duration);

        // Calculate progress percentage
        // Calculate progress percentage as a number
        const progressPercent = Math.round((currentSong.currentTime / currentSong.duration) * 100);
        // Update slider value (numeric)
        const sliderElem = document.querySelector('.slider');
        sliderElem.value = progressPercent;

    }
});

let slider = document.querySelector('.slider');

// Update song position while the user drags the slider
slider.addEventListener('input', (e) => {
  const value = Number(e.target.value);
  if (!isNaN(currentSong.duration) && currentSong.duration > 0) {
    // Seek to the proportion of the track
    currentSong.currentTime = (value / 100) * currentSong.duration;
  }
});

// When the user stops dragging (mouse up / touch end) ensure the UI reflects the final position
slider.addEventListener('change', (e) => {
  const value = Number(e.target.value);
  if (!isNaN(currentSong.duration) && currentSong.duration > 0) {
    currentSong.currentTime = (value / 100) * currentSong.duration;
  }
});


async function main() {



  //Get the list of Song
  Songs = await getSongs('Songs/ncs')


  // playMusic(Songs[0],true)

  let SongUL = document
    .querySelector('.song-list')
    .getElementsByTagName('ul')[0]
  for (const song of Songs) {
    // Build the full URL for playback
    let fullUrl = `http://127.0.0.1:3000/Projects/Spotify%20Clone/${folder}/` + song

    SongUL.innerHTML += `
    <li data-url="${fullUrl}">
      <img class="invert" src="music.svg" alt="">
      <div class="song-info">
        <div>${song.replace(/%20/g, ' ')}</div>
        <div>Song Artist</div>
      </div>
      <img src="play-now.svg" alt="">
    </li>`
  }
  // Load first song into playing bar without auto‑play
  if (Songs.length > 0) {
    const firstUrl = `http://127.0.0.1:3000/Projects/Spotify%20Clone/${folder}/` + Songs[0];
    playMusic(firstUrl, true);
    // Update displayed song title in the playing bar
    const firstTitle = Songs[0].replace(/%20/g, ' ');
    document.querySelector('.playing-bar .song-info').innerHTML = firstTitle;
  }

  Array.from(
    document.querySelector('.song-list').getElementsByTagName('li'),
  ).forEach(e => {
      e.addEventListener('click', () => {
        let track = e.getAttribute('data-url') // ✅ full playable URL
        playMusic(track)
        console.log('Playing:', track)
        // Update playing bar with the song title (and artist placeholder)
        const title = e.querySelector('.song-info div').textContent.trim();
        document.querySelector('.playing-bar .song-info').innerHTML = title;
        // Update currentIndex based on selected track
        const fileName = track.split('/').pop();
        currentIndex = Songs.indexOf(fileName);
      })
  })

  play.addEventListener("click", () => {
    if(currentSong.paused){
      currentSong.play()
      play.innerHTML = `<svg\
                      data-encore-id="icon"
                      role="img"
                      aria-hidden="true"
                      class="e-10451-icon"
                      viewBox="0 0 24 24"
                      width="32"
                      height="32"
                    >
                      <!-- White Background -->
                      <circle cx="12" cy="12" r="12" fill="#ffffff" />

                      <!-- Black Pause Bars -->
                      <path
                        d="M8 6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H8zm6 0a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2z"
                        fill="#000"
                      />
                    </svg>
                    `
    }
    else{
      currentSong.pause()
      play.innerHTML = `
                    <svg
                      data-encore-id="icon"
                      role="img"
                      aria-hidden="true"
                      class="e-10451-icon"
                      viewBox="0 0 24 24"
                      width="32"
                      height="32"
                      >
                      <!-- Green Background -->
                      <circle cx="12" cy="12" r="12" fill="#ffffff" />

                      <!-- Black Play Icon -->
                      <path d="M8.4 6.9L17.3 12L8.4 17.1V6.9Z" fill="#000" />
                    </svg>`
    }
  });

  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0" 
  })

  document.querySelector('.create').addEventListener('click', () => {
    // Check if media query condition is true
    if (window.matchMedia('(max-width: 960px)').matches) {
      document.querySelector('.left').style.left = '-100%'
    }
  })

  //Add event listner to previous
  previous.addEventListener("click", () => {
    // Decrement index with wrap-around
    currentIndex = (currentIndex - 1 + Songs.length) % Songs.length;
    const track = `http://127.0.0.1:3000/Projects/Spotify%20Clone/${folder}/` + Songs[currentIndex];
    playMusic(track);
    const title = Songs[currentIndex].replace(/%20/g, ' ');
    document.querySelector('.playing-bar .song-info').innerHTML = title;
  })

  //Add event listner to next
  next.addEventListener("click", () => {
    // Increment index with wrap-around
    currentIndex = (currentIndex + 1) % Songs.length;
    const track = `http://127.0.0.1:3000/Projects/Spotify%20Clone/${folder}/` + Songs[currentIndex];
    playMusic(track);
    const title = Songs[currentIndex].replace(/%20/g, ' ');
    document.querySelector('.playing-bar .song-info').innerHTML = title;
  });

  //Add an event to volume 
  document.querySelector(".line").getElementsByTagName("input")[0].addEventListener("change", (e) => {
    currentSong.volume = parseInt(e.target.value) / 100
  }) 

  Array.from(document.getElementsByClassName("card")).forEach(e => {
    e.addEventListener('click',async(item) => {
      Songs = await getSongs(`Songs/${ item.currentTarget.dataset.folder}`);
      folder = `/Songs/${item.currentTarget.dataset.folder}`;
      
    })
  });


}

main()
