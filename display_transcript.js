function timestampToSeconds(timestamp) {
  const match = /(\d\d):(\d\d):(\d\d)(\.\d{3})/.exec(timestamp);
  return (
    60 * 60 * parseInt(match[1], 10) +
    60 * parseInt(match[2], 10) +
    parseInt(match[3], 10) +
    parseFloat(match[4])
  );
}

class TranscriptDisplay {
  constructor({ transcriptArea, audioElem, src, vttContent }) {
    this.transcriptArea = transcriptArea;
    this.index = [];
    this.populateTranscript(vttContent);
    this.audioElem = audioElem;
    this.audioElem.controls = true;
    this.audioElem.src = src;
    this.highlightedLine = null;
    this.audioElem.addEventListener("timeupdate", () => {
      this.highlightLineForTime(this.audioElem.currentTime);
    });
  }
  populateTranscript(vttContent) {
    const parts = vttContent.split(/\n\n/g);
    if (parts[0] !== "WEBVTT") {
      throw new Error("Missing WEBVTT magic word");
    }
    let previousPart = "";
    for (let i = 1; i < parts.length; ++i) {
      const currentPart = parts[i];
      if (currentPart === previousPart) {
        continue;
      }
      previousPart = currentPart;
      const match =
        /\d+\n(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})(\n.*)?/s.exec(
          currentPart,
        );
      if (!match) {
        throw new Error(`Can't parse VTT: ${parts[i]}`);
      }
      const startTimestamp = match[1];
      const startTime = timestampToSeconds(startTimestamp);
      const stopTimestamp = match[2];
      const stopTime = timestampToSeconds(stopTimestamp);
      const text = (match[3] || "").trim();
      const elem = document.createElement("div");
      elem.id = startTimestamp;
      elem.classList.add("transcript-line");
      this.index.push({ startTime, stopTime, elem });
      const timeMarker = document.createElement("a");
      timeMarker.dataset.startTime = startTime;
      timeMarker.href = "#" + startTimestamp;
      timeMarker.addEventListener("click", () => {
        this.audioElem.setAttribute(
          "currentTime",
          timeMarker.dataset.startTime,
        );
      });
      timeMarker.classList.add("time-marker");
      timeMarker.textContent = startTimestamp;
      elem.appendChild(timeMarker);
      const textElem = document.createElement("span");
      textElem.classList.add("transcript-text");
      textElem.textContent = text;
      elem.appendChild(textElem);
      this.transcriptArea.appendChild(elem);
    }
  }
  highlightLineForTime(time) {
    let low = 0;
    let high = this.index.length - 1;
    while (high > low) {
      let middle = parseInt((low + high) / 2);
      let middleEntry = this.index[middle];
      if (time < middleEntry.startTime) {
        high = middle - 1;
      } else if (time > middleEntry.stopTime) {
        low = middle + 1;
      } else {
        const middleElem = middleEntry.elem;
        if (this.highlightedLine === middleElem) {
          return;
        } else if (this.highlightedLine) {
          this.highlightedLine.classList.remove("highlighted-line");
        }
        this.highlightedLine = middleElem;
        middleElem.classList.add("highlighted-line");
        middleElem.scrollIntoView();
        return;
      }
    }
  }
}

async function displayTranscript(src, vtt) {
  const audioElem = document.querySelector("#audio-bar audio");
  const transcriptArea = document.querySelector("#transcript");
  const vttContentResponse = await fetch(vtt);
  const vttContent = await vttContentResponse.text();
  new TranscriptDisplay({ transcriptArea, audioElem, src, vttContent });
}

const query = location.search.replace(/^\?/, "").replace("#.*", "");
const params = new URLSearchParams(query);
const src = params.get("src");
const vttSrc = params.get("vtt");
if (src && vttSrc) {
  displayTranscript(src, vttSrc);
}
