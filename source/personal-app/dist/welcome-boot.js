// Runs in the head before application markup can paint.
(()=>{if(window.orbitDesktop?.welcomePending&&!['#pdf','#browser'].includes(location.hash))document.documentElement.classList.add('orbit-welcome-pending');})();
