import { DEFAULT_NUCLEIC_COLORING_SCHEMA, DEFAULT_PROTEIN_COLORING_SCHEMA } from './constants/COLORING_SCHEMAS.js';
import { set_attributes } from './SanKEY_script.js';

export class ColorChooser {
	coloring_schemes = {
		nucleic: {...DEFAULT_NUCLEIC_COLORING_SCHEMA},
		protein: {...DEFAULT_PROTEIN_COLORING_SCHEMA},
		custom_nucleic: {...DEFAULT_NUCLEIC_COLORING_SCHEMA},
		custom_protein: {...DEFAULT_PROTEIN_COLORING_SCHEMA},
		custom_full: {}
	};
	colors;
	visualization_manager;
	coloring_select_input = document.getElementById('coloring_select');
	helper_div = document.getElementById('color_chooser_helper');

	constructor({alignment_type, visualization_manager}) {
		this.colors = this.coloring_schemes[alignment_type];
		this.visualization_manager = visualization_manager;
		for (const option of this.coloring_select_input){
			if(option.value === alignment_type){option.setAttribute('selected', 'selected');}
		}
		this.generateNewColorChooser(false);
		this.addEventListeners();
	}

	generateNewColorChooser(modifiable) {
		this.helper_div.replaceChildren();
		for (const [key, value] of Object.entries(this.colors)) {
			const div = document.createElement('div');
			div.classList.add('color_picker_wrapper');

			const input_field = document.createElement('input');
			set_attributes(input_field, {type:'text', maxlength:'1'});
			input_field.value = key;

			let color_picker;
			if (modifiable){
				color_picker = document.createElement('input');
				set_attributes(color_picker, {type:'color'});
				color_picker.value = value;
			}
			else{
				color_picker = document.createElement('div');
				color_picker.style.backgroundColor = value;
				input_field.setAttribute('readonly','readonly');
			}
			color_picker.classList.add('color_picker');

			div.appendChild(input_field);
			div.appendChild(color_picker);
			if (modifiable){
				div.appendChild(this.createRemoveSymbolButton());
			}
			this.helper_div.appendChild(div);
		}
	}

	createAddSymbolButton() {
		const add_color = document.createElement('button');

		add_color.setAttribute('id','add_color');
		add_color.classList.add('normal_buttons');
		add_color.textContent = 'Add symbol';
		add_color.style.display = 'block';
		this.helper_div.appendChild(add_color);
		add_color.addEventListener('click',()=>{
			const div = document.createElement('div');
			div.classList.add('color_picker_wrapper');
			const input_field = document.createElement('input');
			set_attributes(input_field, {'type':'text','maxlength':'1'});
			const color_picker = document.createElement('input');
			set_attributes(color_picker, {'type':'color'});
			color_picker.classList.add('color_picker');

			div.appendChild(input_field);
			div.appendChild(color_picker);
			div.appendChild(this.createRemoveSymbolButton());
			this.helper_div.removeChild(add_color);
			this.helper_div.appendChild(div);
			this.helper_div.appendChild(add_color);
		});
	}

	createRemoveSymbolButton(){
		const removeButton = document.createElement('input');
		set_attributes(removeButton, {type:'button'});
		removeButton.classList.add('normal_buttons');
		removeButton.value = 'x';
		removeButton.style.cursor = 'pointer';
		removeButton.style.display = 'block';
		removeButton.addEventListener('click',(e)=>{
			e.target.parentElement.remove();
		});
		return removeButton;
	}

	addEventListeners() {
		this.coloring_select_input.addEventListener('change',(e)=>{
			this.colors = this.coloring_schemes[e.target.value];
			this.refreshVisualizationManager();

			if (['custom_nucleic', 'custom_protein', 'custom_full'].includes(e.target.value)){
				this.generateNewColorChooser(true);
				this.createAddSymbolButton();
				document.getElementById('apply_colors').style.removeProperty('display');
			}
			else{
				this.generateNewColorChooser(false);
				document.getElementById('apply_colors').style.display = 'none';
			}
		});

		document.getElementById('apply_colors').addEventListener('click',()=>{
			const arr = Array.from(this.helper_div.children).slice(0,-1);
			const new_colors = {};
			for(const div of arr){
				const symbol = div.children[0].value;
				if (!symbol){
					continue;
				}
				new_colors[symbol] = div.children[1].value;
			}
			this.colors = new_colors;
			this.coloring_schemes[document.getElementById('coloring_select').value] = this.colors;
			this.refreshVisualizationManager();
		});

		document.getElementById('other_color').addEventListener('change', ()=>{
			this.refreshVisualizationManager();
		});
	}

	refreshVisualizationManager(){
		if (!document.getElementById('merge_nodes_vertically').checked){
			this.visualization_manager.plot.setLabelColorsObject(this.colors);
		}
		const [from,to] = this.visualization_manager.rangeMediator.getRange();
		this.visualization_manager.updateAlignmentMatrix(from,to);
		this.visualization_manager.refreshDraggable(this.colors);
	}

	getCurrentColoring(){
		return this.colors;
	}
}