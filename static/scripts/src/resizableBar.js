const sidebar = document.getElementById('sidebar');

document.getElementById('close_settings').addEventListener('click',()=>{
	sidebar.style.display = 'none';
});

let isResizing = false;
const getViewportWidth = () => window.innerWidth || document.documentElement.clientWidth;

const resize_bar = document.getElementById('resize_bar');

const mouseDownCallback = (_) => {
	isResizing = true;
	resize_bar.style.width = '5px';
	resize_bar.style.backgroundColor = 'var(--main-color)';
	document.body.style.cursor = 'ew-resize';
	document.body.classList.add('noselect');
};

resize_bar.addEventListener('mousedown', mouseDownCallback);


document.addEventListener('mousemove', (e) => {
	if (!isResizing) { return; }
	const sidebarWidth = e.clientX;
	const viewportWidth = getViewportWidth();
	if (viewportWidth*0.2 < sidebarWidth && sidebarWidth < viewportWidth*0.6){
		sidebar.style.width = sidebarWidth + 'px';
	}
});

document.addEventListener('mouseup', (_) => {
	if (!isResizing){
		return;
	}
	resize_bar.style.removeProperty('width');
	resize_bar.style.removeProperty('background-color');
	isResizing = false;
	document.body.style.cursor = 'default';
	document.body.classList.remove('noselect');
});


const itemHeaders = document.querySelectorAll('.item-header');
itemHeaders.forEach((header) => {
	header.addEventListener('click', () => {
		const itemContent = header.nextElementSibling;
		const isHidden = itemContent.style.display === 'none';
		itemContent.style.display = isHidden ? 'block' : 'none';

		const style = header.parentElement.style;
		isHidden ? style.backgroundColor = 'var(--second-color)' : style.removeProperty('background-color');
		header.innerHTML = `${header.innerHTML.split(' ').slice(0, -1).join(' ')} ${isHidden ? '&#9662;' : '&#9656;'}`;
	});
});
