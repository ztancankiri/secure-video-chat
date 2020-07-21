let salt = null;
let iv = null;
let key = null;

function generateBytes(text) {
    const bytes = CryptoJS.SHA256(text);
    bytes.sigBytes = 16;
    bytes.words.splice(0, 4);
    bytes.clamp();

    return bytes;
}

function generateRandom(size) {
    return CryptoJS.lib.WordArray.random(size).toString();
}

function init() {
    const salt_text = $('#salt').val();
    const iv_text = $('#iv').val();
    const iteration = parseInt($('#iteration').val());
    const passphrase = $('#passphrase').val();

    salt = generateBytes(salt_text);
    iv = generateBytes(iv_text);

    key = CryptoJS.PBKDF2(passphrase, salt, {
        keySize: 16,
        iterations: iteration,
    });
}

async function send() {
    const socket = io('http://130.211.51.58');

    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const recorder = new MediaRecorder(mediaStream, { mimeType: 'video/webm; codecs="opus,vp8"' });

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                const blob = new Blob([event.data]);
                const reader = new FileReader();

                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    const enc = CryptoJS.AES.encrypt(reader.result, key, { iv }).toString();
                    socket.emit('data', enc);
                };
            }
        };

        recorder.start(10);
    } catch (error) {
        console.log(error);
    }
}

function receive() {
    const socket = io('http://130.211.51.58');

    const arrayOfBlobs = [];
    const mediaSource = new MediaSource();
    const videoPlayer = document.getElementById('videoPlayer');
    videoPlayer.src = URL.createObjectURL(mediaSource);

    let sourceBuffer = null;
    mediaSource.addEventListener('sourceopen', function () {
        sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="opus,vp8"');
        sourceBuffer.addEventListener('updateend', appendToSourceBuffer);
    });

    socket.on('data', async (data) => {
        const ciphertext = CryptoJS.enc.Base64.parse(data);
        const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, { iv }).toString(CryptoJS.enc.Utf8);

        arrayOfBlobs.push(await dataURItoBlob(decrypted).arrayBuffer());
        appendToSourceBuffer();
    });

    function appendToSourceBuffer() {
        if (mediaSource.readyState === 'open' && sourceBuffer && sourceBuffer.updating === false && arrayOfBlobs.length > 0) {
            let chunk = arrayOfBlobs.shift();
            sourceBuffer.appendBuffer(chunk);
            videoPlayer.play();
        }

        // Limit the total buffer size to 20 minutes. This way we don't run out of RAM.
        if (videoPlayer.buffered.length && videoPlayer.buffered.end(0) - videoPlayer.buffered.start(0) > 1200) {
            sourceBuffer.remove(0, videoPlayer.buffered.end(0) - 1200);
        }
    }

    function dataURItoBlob(dataURI) {
        const byteString = atob(dataURI.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ab], { type: 'video/webm; codecs="opus,vp8"' });
    }
}

$('#btn_random').click((e) => {
    $('#salt').val(generateRandom(32));
    $('#iv').val(generateRandom(32));
    $('#passphrase').val(generateRandom(32));
});

$('#btn_receive').click((e) => {
    init();
    receive();
});

$('#btn_send').click((e) => {
    init();
    send();
});