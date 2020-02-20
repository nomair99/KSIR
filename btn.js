var btn_privacy = document.getElementById('btn_privacy');
var btn_hwoTo = document.getElementById('btn_howTo');
var div_privacy = document.getElementById('background');
var div_howTo = document.getElementById('bk');
var close_privavy = document.getElementById('close-button-privacy');
var close_howTo = document.getElementById('close-button-howTo');
 
btn_privacy.onclick = function show() {
	div_privacy.style.display = "block";
}

btn_hwoTo.onclick = function show() {
	div_howTo.style.display = "block";
}
 
close_privavy.onclick = function close() {
	div_privacy.style.display = "none";
} 

close_howTo.onclick = function close() {
	div_howTo.style.display = "none";
} 