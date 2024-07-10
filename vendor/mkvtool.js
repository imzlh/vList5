import { Decoder, tools } from "ebml";
import { Buffer } from 'buffer';

export const extract = file => new Promise(async (rs, rj) => {
    const decoder = new Decoder(),
        tracks = [],
        trackData = [],
        files = [];
    let currentFile = 0,
        currentTimecode,
        trackIndexTemp,
        trackTypeTemp,
        trackDataTemp,
        trackIndex;

    const xhr = await fetch(file);
    if (!xhr.ok || !xhr.body) throw new Error('xhr not ok');

    const stream = xhr.body.getReader();

    decoder.on("error", rj);
    decoder.on("data", chunk => {
        switch (chunk[0]) {
            case "end":
                if (chunk[1].name === "TrackEntry")
                    if (trackTypeTemp === 0x11) {
                        tracks.push(trackIndexTemp);
                        trackData.push([trackDataTemp]);
                    }
                break;
            case "tag":
                if (chunk[1].name === "FileName") {
                    if (!files[currentFile]) files[currentFile] = {};
                    files[currentFile].name = chunk[1].data.toString();
                }
                if (chunk[1].name === "FileData") {
                    if (!files[currentFile]) files[currentFile] = {};
                    files[currentFile].data = chunk[1].data;
                }
                if (chunk[1].name === "TrackNumber")
                    trackIndexTemp = chunk[1].data[0];
                if (chunk[1].name === "TrackType")
                    trackTypeTemp = chunk[1].data[0];
                if (chunk[1].name === "CodecPrivate")
                    trackDataTemp = chunk[1].data.toString();
                if (chunk[1].name === "SimpleBlock" || chunk[1].name === "Block") {
                    const trackLength = tools.readVint(chunk[1].data);
                    trackIndex = tracks.indexOf(trackLength.value);
                    if (trackIndex !== -1) {
                        const timestampArray = new Uint8Array(chunk[1].data).slice(
                            trackLength.length,
                            trackLength.length + 2
                        );
                        const timestamp = new DataView(timestampArray.buffer).getInt16(0);
                        const lineData = chunk[1].data.slice(trackLength.length + 3);
                        trackData[trackIndex].push(
                            lineData.toString(),
                            timestamp,
                            currentTimecode
                        );
                    }
                }
                if (chunk[1].name === "Timecode") {
                    const timecode = readUnsignedInteger(padZeroes(chunk[1].data));
                    currentTimecode = timecode;
                }
                if (chunk[1].name === "BlockDuration" && trackIndex !== -1) {
                    // the duration is in milliseconds
                    const duration = readUnsignedInteger(padZeroes(chunk[1].data));
                    trackData[trackIndex].push(duration);
                }
                break;
            default:
            // do nothing
        }
        if (
            files[currentFile] &&
            files[currentFile].name &&
            files[currentFile].data
        ) {
            currentFile++;
        }
    });

    while (true) {
        const readed = await stream.read();
        if (readed.done) {
            trackData.forEach((entries, index) => {
                const heading = entries[0];
                const isASS = heading.includes("Format:");
                const formatFn = isASS ? formatTimestamp : formatTimestampSRT;
                const eventMatches = isASS
                    ? heading.match(/\[Events\]\s+Format:([^\r\n]*)/)
                    : [""];
                const headingParts = isASS ? heading.split(eventMatches[0]) : ["", ""];
                const fixedLines = [];
                for (let i = 1; i < entries.length; i += 4) {
                    const line = entries[i];
                    const lineTimestamp = entries[i + 1];
                    const chunkTimestamp = entries[i + 2];
                    const duration = entries[i + 3];
                    const lineParts = isASS && line.split(",");
                    const lineIndex = isASS ? lineParts[0] : (i - 1) / 4;
                    const startTimestamp = formatFn(chunkTimestamp + lineTimestamp);
                    const endTimestamp = formatFn(
                        chunkTimestamp + lineTimestamp + duration
                    );

                    const fixedLine = isASS
                        ? "Dialogue: " +
                        [lineParts[1], startTimestamp, endTimestamp]
                            .concat(lineParts.slice(2))
                            .join(",")
                        : lineIndex +
                        1 +
                        "\r\n" +
                        startTimestamp.replace(".", ",") +
                        " --> " +
                        endTimestamp.replace(".", ",") +
                        "\r\n" +
                        line +
                        "\r\n";

                    if (fixedLines[lineIndex]) {
                        fixedLines[lineIndex] += "\r\n" + fixedLine;
                    } else {
                        fixedLines[lineIndex] = fixedLine;
                    }
                }
                const data =
                    (isASS ? headingParts[0] + eventMatches[0] + "\r\n" : "") +
                    fixedLines.join("\r\n") +
                    headingParts[1] +
                    "\r\n";

                files.push({
                    type: isASS ? "ass" : "srt",
                    id: index +1,
                    data
                });
            });

            if (files.length === 0)
                rj(new Error("No data found"));

            return rs(files);
        }
        decoder.write(Buffer.from(readed.value));
    }
});


function padZeroes(arr) {
    const len = Math.ceil(arr.length / 2) * 2;
    const output = new Uint8Array(len);
    output.set(arr, len - arr.length);
    return output.buffer;
}

function readUnsignedInteger(data) {
    const view = new DataView(data);
    return data.byteLength === 2 ? view.getUint16(0) : view.getUint32(0);
}

function formatTimestamp(timestamp) {
    const seconds = timestamp / 1000;
    const hh = Math.floor(seconds / 3600);
    let mm = Math.floor((seconds - hh * 3600) / 60);
    let ss = (seconds - hh * 3600 - mm * 60).toFixed(2);

    if (mm < 10) mm = `0${mm}`;
    if (ss < 10) ss = `0${ss}`;

    return `${hh}:${mm}:${ss}`;
}

function formatTimestampSRT(timestamp) {
    const seconds = timestamp / 1000;
    let hh = Math.floor(seconds / 3600);
    let mm = Math.floor((seconds - hh * 3600) / 60);
    let ss = (seconds - hh * 3600 - mm * 60).toFixed(3);

    if (hh < 10) hh = `0${hh}`;
    if (mm < 10) mm = `0${mm}`;
    if (ss < 10) ss = `0${ss}`;

    return `${hh}:${mm}:${ss}`;
}