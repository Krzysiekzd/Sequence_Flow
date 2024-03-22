import {Sortable } from 'sortablejs';

export class DragAndDropGrouped {
	main_dom_element;
	groups = [];

	constructor({groups, acids_coloring, element}){
		this.main_dom_element = element;
		const skipped_dashed = {...acids_coloring};
		delete skipped_dashed['-'];
		groups.forEach((group)=>this.createGroup({...group, acids_coloring: skipped_dashed}));

		document.getElementById('add_group').addEventListener('click', ()=>{
			this.createGroup({
				acids: [],
				name: 'New group',
				color: '#000000',
				acids_coloring: {}
			});
		});
	}

	refreshColoring(acids_coloring){
		const new_acids_coloring = {...acids_coloring};
		delete new_acids_coloring['-'];

		const groups_data = this.groups.map((group)=>group.getGroupData());
		this.groups.forEach((group)=>group.destroy());
		this.groups = [];

		const new_symbols = new Set(Object.keys(new_acids_coloring));
		groups_data.forEach(group=>{group.acids.forEach((acid)=>{new_symbols.delete(acid);});});
		groups_data.forEach((group)=> {
			if (group.acids.length === 0){
				return;
			}
			this.createGroup({...group, acids_coloring:new_acids_coloring});
		});

		if (new_symbols.size === 0){
			return;
		}
		this.createGroup({
			acids: Array.from(new_symbols),
			name: 'New group',
			color: '#000000',
			acids_coloring: new_acids_coloring
		});
	}

	createGroup({acids, name, color, acids_coloring}){
		const group = new Group({acids, name, color, acids_coloring, parent_element: this.main_dom_element});
		this.groups.push(group);
	}

	getGroupsData(){
		return this.groups.map((group)=>group.getGroupData());
	}

}

class Group {
	main_element = document.createElement('div');
	sortable_element = document.createElement('div');

	constructor({acids, name, color, acids_coloring, parent_element}){
		this.main_element.classList.add('acids_group_wrapper');
		parent_element.appendChild(this.main_element);

		this.sortable_element.classList.add('amino_acids_group');
		Sortable.create(this.sortable_element, {
			group: 'acids',
			sort: true
		});

		const inputs = document.createElement('div');
		inputs.classList.add('acids_inputs_wrapper');

		const text_label = document.createElement('label');
		text_label.textContent = 'Name';
		const color_label = document.createElement('label');
		color_label.textContent = 'Color';

		const text_input = document.createElement('input');
		text_input.type = 'text';
		text_input.value = name;
		text_input.classList.add('acids_group_name_input');


		const color_picker = document.createElement('input');
		color_picker.type = 'color';
		color_picker.value = color;
		color_picker.classList.add('acids_color_input');

		this.main_element.append(this.sortable_element, inputs);
		inputs.append(text_label, text_input, color_label, color_picker);

		this.createAcids(acids, acids_coloring);
	}

	createAcids(acids, acids_coloring){
		acids.forEach((acid_name) => new DraggableAcid({
			parent_element: this.sortable_element,
			name: acid_name,
			color: acid_name in acids_coloring ? acids_coloring[acid_name] : document.getElementById('other_color').value
		}));
	}

	getGroupData(){
		return { 
			acids: Array.from(this.sortable_element.children).map((child)=>child.textContent),
			name: this.main_element.getElementsByClassName('acids_group_name_input')[0].value,
			color: this.main_element.getElementsByClassName('acids_color_input')[0].value,
		};
	}

	destroy(){
		this.sortable_element.remove();
		this.sortable_element = undefined;
		this.main_element.remove();
		this.main_element = undefined;
	}
}

class DraggableAcid {
	element = document.createElement('div');
	
	constructor({parent_element, name, color}){
		this.element.textContent = name;
		this.element.classList.add('draggable_amino_acid');
		this.element.setAttribute('id', 'test'+'_'+name);
		this.element.style.backgroundColor = color;
		parent_element.appendChild(this.element);
	}
}