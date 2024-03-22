export class PageManager{
	constructor(){
		this.active_page = undefined;
	}
	changeActivePage(new_page){
		this.active_page.hide();
		this.active_page = new_page;
		this.active_page.show();
	}
}
export class Subpage{
	constructor(dom_element, page_button, page_manager){
		this.main_container = dom_element;
		this.main_container.style.display = 'none';
		this.page_button = page_button;
		this.page_manager = page_manager;
		this.page_button.addEventListener('click', ()=>{this.page_manager.changeActivePage(this);});
	}
	hide(){
		this.main_container.style.display = 'none';
		this.page_button.classList.remove('page_button_selected');
		return this;
	}
	show(){
		this.main_container.style.removeProperty('display');
		this.page_button.classList.add('page_button_selected');
		return this;
	}
	remove(){
		this.main_container.remove();
	}
}