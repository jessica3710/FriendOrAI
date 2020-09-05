// get the modal
var modal = document.getElementById("myModal");

// get the button that opens the modal
var btn = document.getElementById("helpButton");

// get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];


// when the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// when the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

btn.addEventListener("click", ev => {
  modal.style.display = "block";
});

document.getElementById("form").addEventListener("submit", (event) => {
  event.preventDefault();
  let text = document.getElementById("textField");
  document.getElementById("listTable").style.display = "block";
});