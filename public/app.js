(function () {
  // Create an endpoints database
  let session = {};
  let contacts = [];
  const myname = 'will';

  const startConnection = (from) => {
    // After 'CALL_REQUEST', set up RTCPeerConnection
    const pc = new RTCPeerConnection();

    // Listener for when candidate received
    pc.onicecandidate = (e) => {
      console.log('....receiving candidate....');
      if(e.candidate) {
        console.log('.....Sending candidate....')
        //EDIT
        send(from, 'CANDIDATE', e.candidate);
      } else {
        return;
      }
    };

    // Listener for when stream received
    pc.onaddstream = (e) => {
      // Add peers stream to right side
      let videoR = document.getElementById('video-display-R');
      videoR.srcObject = e.stream;
      videoR.play();
      console.log('(Displaying ' + from + 's video stream)')
    }

    let options = {
      video: {width: 1280, height: 720},
      audio: true
    };
    // Save pc locally
    session.pc = pc;
    // Initialise webcam before peer answers call
    return navigator.mediaDevices.getUserMedia(options)
    .then((avStream) => {
      console.log('Setting up users webcam before peer answers')
      let videoL = document.getElementById('video-display-L');
      videoL.srcObject = avStream;
      videoL.onloadedmetadata = function(e) {
          videoL.play();
      }
      console.log('Add stream to peer connection')
      pc.addStream(avStream);
    })
    .catch(function(err) {
        console.log(err.name + ': ' + err.message);
    });

  }

  // Create a listener callback
  const listenerCb = (from, command, info) => {
    switch(command) {
      // Called when registered

      case 'CALL_REQUEST':
        // Make new Peer Connection and pass userId object
        startConnection(from);
        //Send message after Peer connection set up to accept
        console.log('Receiving call from ' + from);
        send(from, 'CALL_ACCEPT');
        break;

      case 'CALL_ACCEPT':
        console.log('Setting up connection' )
        startConnection(from)
        .then( () => {
          // Get connection data
          session.pc.createOffer().then((offer) => {
            console.log('Store offer')
            session.pc.setLocalDescription(offer);
            console.log('Sending offer to ' + from)
            send(from, 'OFFER', offer);
          })
        });
        break;

      case 'OFFER':
        console.log('Storing offer from ' + from)
        session.pc.setRemoteDescription(new RTCSessionDescription(info))
        .then( () => session.pc.createAnswer())
        .then((answer) => {
          console.log('Storing own answer, and sending answer to ' + from)
          session.pc.setLocalDescription(answer);
          send(from, 'ANSWER', answer)
        })
        break;

      case 'ANSWER':
        console.log('Received answer from ' + from + ' and storing it')
        session.pc.setRemoteDescription(new RTCSessionDescription(info))
        break;

      case 'CANDIDATE':
        console.log('.....Candidate identified.....');
        console.log('.....Adding ice candidate.....');
        session.pc.addIceCandidate(new RTCIceCandidate(info));
        break;

      case 'CALL_DENIED':
        break;

      default:
        return;
    }
  }

  const poll = () => {
    let url = `https://192.168.2.13:3000/poll/${myname}`;
    request.get(url, (err, response) => {
      if(err) console.log(`error with poll request: ${err}`);
      response = JSON.parse(response);
      // Manage Contacts
      contacts = response.directory;
      console.log(`Your contacts: ${contacts}`);
      const dropdown = document.getElementById('dropdown');
      while (drop.hasChildNodes()) {
      dropdown.removeChild(dropdown.lastChild);
      }
      contacts.forEach( (contact) => {
        let option = document.createElement('OPTION');
        option.value = contact;
        option.innerText = contact;
        dropdown.appendChilld(option);
      })
      // Manage Messages
      let messages = response.messages;
      console.log(`Your messages: ${messages}`);
      if(messages.length === 0) {
        return;
      }
      messages.forEach( ({from, data}) => {
        data = JSON.parse(data);
        let command  = data.command;
        let info = data.info;
        console.log(`Processing ${command} from ${from}`);
        listenerCb(from, command, info)

      })
    })
  }

  const send = (toname, command, info = null) => {
    let data = {command, info};
    data = JSON.stringify(data);
    const url = `https://192.168.2.13:3000/send/${myname}/${toname}`;
    request.post(url, data, (err, response) => {
      (response === 'success') ? console.log(response) : alert(response);
    })
  }

  setInterval(() => {
    poll(myname);
  }, 5000);


  // Register click event to call buttons
  const callBtns = document.querySelectorAll('.call-btn');
  Array.prototype.forEach.call(callBtns, (button) => {
    button.addEventListener('click', () => {
      let to = document.getElementById('dropdown').value;
      send(to, 'CALL_REQUEST');
    })
  })

})();
