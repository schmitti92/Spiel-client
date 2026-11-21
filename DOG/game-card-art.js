/* Show the DOG title inside the artwork only after its real image loads. */
(function(){
 const paint=img=>{
  const card=img.closest('.dog-online-card,.dog-classic-card');
  if(!card)return;
  card.classList.toggle('dog-art-ready',img.complete&&img.naturalWidth>100);
 };
 document.querySelectorAll('img.dog-card-art').forEach(img=>{
  img.addEventListener('load',()=>paint(img));
  img.addEventListener('error',()=>paint(img));
  paint(img);
 });
})();