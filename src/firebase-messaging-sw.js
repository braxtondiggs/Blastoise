importScripts('https://www.gstatic.com/firebasejs/8.5.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.5.0/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyDbZdvXWv6QX342Xb0zDjOUEK0Eho-_cCo",
    authDomain: "blastoise-5d78e.firebaseapp.com",
    projectId: "blastoise-5d78e",
    storageBucket: "blastoise-5d78e.appspot.com",
    messagingSenderId: "10221056998",
    appId: "1:10221056998:web:5a11b6e094a04cc6681c27"
});

const messaging = firebase.messaging();

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('https://braxton.beer'));
});
