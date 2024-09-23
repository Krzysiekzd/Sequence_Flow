import noUiSlider from 'nouislider';
import { scaleOrdinal, schemeDark2 } from 'd3';
import { downloadPng, downloadSvg } from 'svg-crowbar';
import { PlotCreator } from './SanKEY_script.js';
import { DragAndDropGrouped } from './DragAndDropGrouped.js';
import { SequenceProcessor } from './SequenceProcessor.js';
import { AlignmentMatrixVisualization } from './AlignmentMatrixVisualization.js';
import { SankeyDataModifier } from './SankeyDataModifier.js';
import { ColorChooser } from './ColorChooser.js';
import { ColumnRangeMediator } from './ColumnRangeMediator.js';
import { UNDEFINED_SYMBOL_COLOR } from './constants/COLORING_SCHEMAS.js';
import { STANDARD_GROUPING_SCHEMA } from './constants/GROUPING_SCHEMAS.js';

export class VisualizationManger{
	alignment_matrix_visualization;

	tree;
	selection_id = 0;
	color_scheme = scaleOrdinal(schemeDark2);

	sequences;
	sequences_names;
	sequences_order;

	nodes;
	links;
	plot_width;
	plot_height;
	plot;

	slider;

	color_chooser;
	undefined_symbol_color;
	highlight_color = getComputedStyle(document.body).getPropertyValue('--bright-main-color');

	drag_and_drop;

	selected_sequences_buttons = {};

	merged = false;
	merge_colors = {};

	rangeMediator;

	constructor({nodes, links, sequences, sequences_names, alignment_type, tree}) {

		const first_column = 1;
		const last_column = Math.min(15,sequences[0].length);
		this.setInitialPlotDimensions();

		this.sequences = sequences;
		this.sequences_names = sequences_names;
		this.nodes = nodes;
		this.links = links;

		this.sequences_order = {};
		sequences_names.forEach((seq, index)=>{
			this.sequences_order[seq] = index;
		});

		const inputFrom = document.getElementById('from_column');
		const inputTo = document.getElementById('to_column');
		const alignment_bar = document.getElementById('alignment_bar');

		inputFrom.value = first_column;
		inputTo.value = last_column;

		noUiSlider.create( alignment_bar, {
			start: [first_column, last_column],
			connect: true,
			range: { min:1, max: sequences[0].length,},
			margin: 1,
			step: 1,
			keyboardSupport: false,
			behaviour: 'drag'
		});
		this.slider = alignment_bar.noUiSlider;
		this.rangeMediator = new ColumnRangeMediator({
			slider: this.slider,
			inputFrom,
			inputTo,
			columnFrom: first_column,
			columnTo: last_column,
			length: this.sequences[0].length
		});


		this.undefined_symbol_color = UNDEFINED_SYMBOL_COLOR;
		this.color_chooser =  new ColorChooser({ alignment_type, visualization_manager: this });

		this.createPlot(this.nodes, this.links, this.color_chooser.getCurrentColoring());
		this.functionalizeNavigation({inputFrom, inputTo});
		this.addClearButtonEvent();
		this.functionalizeSettings(alignment_type);
		this.createDraggable();
		this.tree = tree ? tree : undefined;
		this.tree ? this.createTree() : null;
		this.createClassicalAlignment();
		this.functionalizeHighlightColorPicker();
	}

	setInitialPlotDimensions(){
		const sankey_diagram_container = document.getElementById('sankey_diagram_container');
		const width = Math.floor(sankey_diagram_container.getBoundingClientRect().width) - 4;
		document.getElementById('main_grid').style.minWidth = `${width / 65*100}px`; 
		document.body.style.setProperty('--sankey-plot-width', `${width}px`);   
		sankey_diagram_container.style.setProperty('width', 'var(--sankey-plot-width)');
		this.plot_width = width;
		this.plot_height = 398;
	}

	createPlot(nodes, links, colors){
		const second_color = getComputedStyle(document.body).getPropertyValue('--second-color');
		const [columnFrom, columnTo] = this.rangeMediator.getRange();
		this.plot = new PlotCreator(
			document.getElementById('sankey_diagram_container'),
			nodes,
			links,
			this.plot_width,
			this.plot_height,
			columnFrom,
			columnTo+1,
			{
				vertical_gap_between_nodes: 0.5,
				node_percent_of_column_width: 0.4,
				show_column_lines: Boolean(document.getElementById('show_column_lines').checked),
				show_column_names: Boolean(document.getElementById('show_column_numbers').checked),
				node_move_y: Boolean(document.getElementById('allow_moving_nodes').checked),
				linear_gradient_links: Boolean(document.getElementById('linear_gradient_links').checked),
				plot_background_color: 'white',
				default_nodes_color: this.undefined_symbol_color,
				default_links_color: second_color,
				default_links_opacity: 0.25,
				default_gradient_links_opacity: 0.43,
				default_sublinks_color: this.highlight_color,
				default_sublinks_opacity: 1,
				label_colors_object: colors,
				start_column_count_from: 1,
				start_node_count_from: 1,
				show_links_out_of_range : Boolean(document.getElementById('links_out_of_range').checked),
				lines_style_object: {stroke:second_color, 'stroke-width':2, 'stroke-opacity':0.35, 'stroke-dasharray':'5,5'},
				column_names_style_object: {'font-size':'16px', color:second_color, opacity:1,'font-weight':'bold'},
				on_node_click_function: (node_info)=>{
					const node_label = node_info.label;
					const map = this.merged ? SequenceProcessor.createAcidsGroupMap(this.current_groups_data): {};
					const column = node_info.column - 1;

					const node_sequences = [];
					// find sequences assosiated with the clicked node
					for (const sequence_name of this.sequences_names){
						const entity = this.sequences[this.sequences_order[sequence_name]][column];
						const compared_label = this.merged ? map[entity]: entity;
						if ( node_label !== compared_label){
							continue;
						}
						node_sequences.push(sequence_name);
					}

					const selected_sequences = new Set(this.getSelectedSequences());
					const sequences_to_highlight = node_sequences.filter(seq_name => !selected_sequences.has(seq_name));
					
					if (sequences_to_highlight.length === 0){
						node_sequences.forEach((seq_name)=>this.toggleSequenceHighlight(seq_name));
						this.unselectTreeNodes(node_sequences);
					} else{
						sequences_to_highlight.forEach((seq_name)=>this.toggleSequenceHighlight(seq_name));
						this.selectTreeNodes(sequences_to_highlight);
					}
					setTimeout(()=>{this.plot.reloadPlot();},0);
				},
				on_node_hover_function: (node_info)=>{
					const n_seq = Math.max(node_info['left_side_sum'], node_info['right_side_sum']);
					return `<b>${node_info['label']}</b></br>${node_info['height']} ${n_seq>1?'sequences':'sequence'}</br>column ${node_info['column']}`;
				},
				on_link_hover_function: (link_info)=>{
					let sequences_string  = `${link_info['value']} ${link_info['value']>1?'sequences':'sequence'}`;
					if (link_info.sublink_data){
						sequences_string = this.sequences_names[link_info.sublink_data.sequence_index];
					}
					return `<b>(${link_info['from_column']},${link_info['from_label']}) &#8594; (${link_info['to_column']},${link_info['to_label']})</b></br>${sequences_string}`;
				},
				hover_link_cursor: 'initial'
			}
		);
	}

	changeRange({columnFrom, columnTo, source}){
		if (!this.rangeMediator.updateRange({columnFrom, columnTo, source})){
			return;
		}
		if (!this.plot.changeColumnRange(columnFrom,columnTo+1)){
			return;
		}
		this.updateAlignmentMatrix(columnFrom,columnTo);
	}

	functionalizeNavigation({inputFrom, inputTo}){
		// add functionalities
		const moveLeft = () => {
			const currentRange = this.rangeMediator.getRange();
			this.changeRange({
				columnFrom: currentRange[0] - 1,
				columnTo: currentRange[1] - 1,
				source: 'key_or_arrow'
			});
		};
		const moveRight = () => {
			const currentRange = this.rangeMediator.getRange();
			this.changeRange({
				columnFrom: currentRange[0] + 1,
				columnTo: currentRange[1] + 1,
				source: 'key_or_arrow'
			});
		};
		document.getElementById('move_left').addEventListener('click', moveLeft);
		document.getElementById('move_right').addEventListener('click', moveRight);
		this.keydownCallback = (e)=>{
			if  (e.target.tagName.toLowerCase() === 'input'){
				return;
			}
			if (e.key==='ArrowRight'){
				moveRight();
			}
			if (e.key==='ArrowLeft'){
				moveLeft();
			}
		};
		
		document.addEventListener('keydown', this.keydownCallback);

		this.slider.on('update', ()=>{
			const range = this.slider.get();
			const start = parseInt(range[0]);
			const end = parseInt(range[1]);
			inputFrom.value = start;
			inputTo.value = end;
		});

		this.slider.on('change', ()=>{
			const range = this.slider.get();
			const columnFrom = parseInt(range[0]);
			const columnTo = parseInt(range[1]);
			this.changeRange({columnFrom, columnTo, source: 'slider'});
		});

		inputFrom.addEventListener('change', (e)=> {
			const [currentFrom, currentTo] = this.rangeMediator.getRange();
			const newFrom = Math.floor(Number(e.target.value));
			if (newFrom <= 0 || newFrom >= currentTo) {
				inputFrom.value = currentFrom;
				return;
			}
			this.changeRange({
				columnFrom: Number(e.target.value),
				columnTo: currentTo,
				source: 'input'
			});
		});

		inputTo.addEventListener('change', (e)=> {
			const [currentFrom, currentTo] = this.rangeMediator.getRange();
			const newTo = Math.floor(Number(e.target.value));

			if (newTo <= currentFrom || newTo >= this.sequences[0].length) {
				inputTo.value = currentTo;
				return;
			}
			this.changeRange({
				columnFrom: currentFrom,
				columnTo: Number(e.target.value),
				source: 'input'
			});
		});
	}

	functionalizeSettings(alignment_type){
		const mo = document.getElementById('merging_options');
		const mw = document.getElementById('merge_nodes_wrapper');
		alignment_type === 'nucleic' ? mo.style.display = 'none' : mo.style.removeProperty('display');
		alignment_type === 'nucleic' ? mw.style.display = 'none' : mw.style.removeProperty('display');
		// functionalize display settings
		document.getElementById('show_column_lines').addEventListener('change',(e)=>{this.plot.columnLines(e.target.checked);});
		document.getElementById('show_column_numbers').addEventListener('change',(e)=>{this.plot.columnNames(e.target.checked);});
		document.getElementById('linear_gradient_links').addEventListener('change',(e)=>{this.plot.linearGradient(e.target.checked);});
		document.getElementById('allow_moving_nodes').addEventListener('change',(e)=>{this.plot.yMovement(Boolean(e.target.checked));});
		document.getElementById('links_out_of_range').addEventListener('change',(e)=>{this.plot.setShowLinksOutOfRange(e.target.checked);});
		const other_color = document.getElementById('other_color');
		other_color.value = this.undefined_symbol_color;
		other_color.addEventListener('change',()=>{
			this.undefined_symbol_color = other_color.value;
			this.plot.setDefaultNodesColor(other_color.value);
			const [from,to] = this.rangeMediator.getRange();
			this.updateAlignmentMatrix(from,to);
		});
		document.getElementById('settings_button').addEventListener('click',()=>{
			const _ = document.getElementById('sidebar').style;
			_.display === 'none' ? _.removeProperty('display') : _.display = 'none';
		});
		document.getElementById('save_image').addEventListener('click', ()=>{
			const format = document.getElementById('image_format_select').value;
			const diagramSelector = document.getElementById('sankey_field');
			if (format === 'svg') {
				downloadSvg(diagramSelector, 'poa_diagram');
			} else {
				downloadPng(diagramSelector, 'poa_diagram', {downloadPNGOptions:{ scale: 2 }});
			}
			this.plot.reloadPlot();
		});
	}

	addClearButtonEvent(){
		document.getElementById('clear_button').addEventListener('click', ()=>{
			this.clearSequencesHighlight();
			this.plot.reloadPlot();
		});
	}

	getSelectedSequences() {
		const selected_names = [];
		for (const [k,v] of Object.entries(this.selected_sequences_buttons)){
			if (!v.selected){
				continue;
			}
			selected_names.push(k);
		}
		return selected_names;
	}

	mergeNodes(merge){
		this.merged = merge;
		this.plot.removePlot();
		const reselectSequences = (sequences_names) => {
			for (const name of sequences_names){
				this.toggleSequenceHighlight(name);
			}
			this.selectTreeNodes(sequences_names);
		};

		const selected_sequences = this.getSelectedSequences();
		if (merge){
			this.drag_and_drop.refreshColoring(this.color_chooser.getCurrentColoring()); //to get rid of empty groups
			this.current_groups_data = this.drag_and_drop.getGroupsData();
			const colors = this.current_groups_data.reduce((acc,group)=>{return {...acc, [group.name]:group.color};},{});
			this.grouped_nodes = undefined;
			this.grouped_links = undefined;
			this.grouped_nodes = SequenceProcessor.createGroupedNodesData(this.sequences,this.current_groups_data);
			this.grouped_links = SequenceProcessor.createGroupedLinksData(this.sequences, this.grouped_nodes, this.current_groups_data);
			this.clearSequencesHighlight();
			reselectSequences(selected_sequences);
			this.createPlot(this.grouped_nodes,this.grouped_links, colors);
		}
		else{
			this.clearSequencesHighlight();
			reselectSequences(selected_sequences);
			this.createPlot(this.nodes, this.links, this.color_chooser.getCurrentColoring());
			this.grouped_nodes = undefined;
			this.grouped_links = undefined;
		}
		this.merge_colors = this.drag_and_drop.getGroupsData().reduce((acc, {acids, color})=>{
			acids.forEach((acid)=>acc[acid]=color);
			return acc;
		},{'-':'#FFFFFF'});
		const [columnFrom, columnTo] = this.rangeMediator.getRange();
		this.updateAlignmentMatrix(columnFrom, columnTo);
	}

	createDraggable(){
		const predefined_schemas = {
			standard: STANDARD_GROUPING_SCHEMA
		};
		this.drag_and_drop = new DragAndDropGrouped({
			groups:predefined_schemas.standard,
			element: document.getElementById('for_draggable'),
			acids_coloring: this.color_chooser.getCurrentColoring()
		});

		const merge_checkbox = document.getElementById('merge_nodes_vertically');
		merge_checkbox.addEventListener('change',(e)=>{
			const merge = e.target.checked;
			this.mergeNodes(merge);
		});

		document.getElementById('apply_merging').addEventListener('click', ()=>{
			merge_checkbox.checked = true;
			this.mergeNodes(true);
		});
	}

	refreshDraggable(new_coloring){
		this.drag_and_drop.refreshColoring(new_coloring);
	}

	createClassicalAlignment(){
		const button_height = getComputedStyle(document.body).getPropertyValue('--select-sequence-button-height');
		const button_width = `calc(${getComputedStyle(document.body).getPropertyValue('--select-sequence-button-width')} + 2px)`;

		// create buttons
		const buttons_div = document.getElementById('for_buttons');
		let count = 0;
		for (const seq_name of this.sequences_names){
			const button = document.createElement('div');
			this.selected_sequences_buttons[seq_name]={button:button,selected:false};
			button.setAttribute('value',seq_name);
			button.textContent = seq_name;
			button.style.width = button_width;
			button.classList.add('highlight_sequence_button');
			button.classList.add('animated_button');
			count === 0 ? button.style.borderTop = '2px solid var(--dark-second-color)' : null;
			count === this.sequences_names.length - 1 ? button.style.borderBottom = '2px solid var(--dark-second-color)' : null;
			buttons_div.appendChild(button);
			button.addEventListener('click',()=>{
				this.toggleSequenceHighlight(seq_name);
				this.plot.reloadPlot();
			});
			count++;
		}

		const tree_div = document.getElementById('for_tree');
		this.tree ?  buttons_div.style.display = 'none' : buttons_div.style.removeProperty('display');
		this.tree ? tree_div.style.removeProperty('display') : tree_div.style.display = 'none';
		
		this.alignment_matrix_visualization = new AlignmentMatrixVisualization( {
			dom_element: document.getElementById('for_letters'),
			column_height: button_height,
			n_sequences: this.sequences.length,
			sequences_names: this.sequences_names
		});
		const [from, to] = this.rangeMediator.getRange();
		this.updateAlignmentMatrix(from, to);
	}

	updateAlignmentMatrix(start, end){
		this.alignment_matrix_visualization.displayRange({
			start, end,
			symbols_coloring: this.merged ? this.merge_colors : this.color_chooser.getCurrentColoring(),
			undefined_symbol_color: this.undefined_symbol_color,
			sequences: this.sequences,
			sequences_buttons: this.selected_sequences_buttons
		});
	}

	selectSequence(sequence_name){
		const sequence_index = this.sequences_order[sequence_name];
		SankeyDataModifier.selectSequence({
			sequences: this.sequences,
			sequence_index,
			merged: this.merged,
			nodes: this.merged ? this.grouped_nodes: this.nodes,
			links: this.merged ? this.grouped_links :this.links,
			acids_labels_groups_map: this.merged ? SequenceProcessor.createAcidsGroupMap(this.current_groups_data): {}
		});
		this.alignment_matrix_visualization.selectSequence(sequence_name);
	}

	unselectSequence(sequence_name){
		const sequence_index = this.sequences_order[sequence_name];
		SankeyDataModifier.unselectSequence({
			links: this.merged ? this.grouped_links :this.links,
			sequence_index
		});
		this.alignment_matrix_visualization.unselectSequence(sequence_name);
	}

	clearSequencesHighlight(){
		// clear all selection in phylotree
		if(this.tree){
			this.tree.display.modifySelection((_)=>{
				return false;
			});
			for (const seq in this.selected_sequences_buttons){
				this.selected_sequences_buttons[seq]['selected']=false;
			}
			// end
		}
		for (const seq in this.selected_sequences_buttons){
			this.selected_sequences_buttons[seq]['button'].style.removeProperty('background-color');
			this.selected_sequences_buttons[seq]['button'].style.removeProperty('color');
			this.selected_sequences_buttons[seq]['selected']=false;
		}
		SankeyDataModifier.unselectAllSequences(this.merged ? this.grouped_links :this.links);
		this.updateAlignmentMatrix(...this.rangeMediator.getRange());
	}

	toggleSequenceHighlight(sequence_name){
		if (this.selected_sequences_buttons[sequence_name].selected){
			this.unselectSequence(sequence_name);
			this.selected_sequences_buttons[sequence_name].button.style.removeProperty('background-color');
			this.selected_sequences_buttons[sequence_name].button.style.removeProperty('color');
			this.selected_sequences_buttons[sequence_name].selected = false;
		}
		else {
			this.selectSequence(sequence_name);
			this.selected_sequences_buttons[sequence_name].button.style.backgroundColor = this.highlight_color;
			this.selected_sequences_buttons[sequence_name].button.style.color = 'white';
			this.selected_sequences_buttons[sequence_name].selected = true;
		}
	}

	functionalizeHighlightColorPicker() {
		const picker = document.getElementById('highlight_color_picker');
		picker.value = this.highlight_color;

		picker.addEventListener('change', ()=>{
			this.highlight_color = picker.value;
			document.getElementById('for_buttons').style.setProperty('--bright-main-color', this.highlight_color);
			this.plot.setDefaultSublinksColor(this.highlight_color);
			if (this.tree){
				this.tree.display.update();
			}
			Object.values(this.selected_sequences_buttons).forEach((data)=>{
				if (!data.selected){
					return;
				}
				data.button.style.backgroundColor = this.highlight_color;
			});
		});
	}

	// TREE METHODS

	allChildrenSelected(parent){
		const id = this.selection_id;
		for (const child of parent.children) {
			if (!child[id]){
				return false;
			}
		}
		return true;
	}

	modifyTreeSelection(descendants){
		const id = this.selection_id;
		this.tree.display.modifySelection( (d) => {
			if (descendants.includes(d.target)) {
				return false;
			} else if (!descendants.includes(d.target) && d.target[id]) {
				return true;
			} else {
				return false;
			}
		});
		this.tree.display.modifySelection(descendants);
	}

	createTree(){
		const button_height = Number(getComputedStyle(document.body).getPropertyValue('--select-sequence-button-height').slice(0,-2));
		const tree_container = document.getElementById('for_tree');
		tree_container.style.removeProperty('display');
		const height = button_height * this.sequences.length;
		tree_container.style.height = `${height}px`;
		this.tree.render({
			container: tree_container,
			width:  Math.floor(tree_container.getBoundingClientRect().width),
			height: height,
			zoom: false,
			collapsible: false,
			reroot: false,
			hide: false,
			brush: false,
			'align-tips': true,
			'show-scale': false,
			'show-menu': false,
			'node-styler': (e,d)=>{ this.treeNodeStyler(e,d); },
			'edge-styler': (e,d)=>{ this.treeEdgeStyler(e,d); },
			'top-bottom-spacing': 'fit-to-size',
			'left-right-spacing': 'fit-to-size',
			'draw-size-bubbles': false,
			'bubble-styler': _=>5,

		});
		tree_container.append(this.tree.display.show());
		this.updateTreeSelection();
		for (const seq_name of this.sequences_names){
			this.selected_sequences_buttons[seq_name]={selected:false};
		}
	}
	
	toggleSankeyPaths(new_selection){
		for (const seq in this.selected_sequences_buttons){
			if (new_selection.has(seq) && !this.selected_sequences_buttons[seq].selected){
				this.selectSequence(seq);
				this.selected_sequences_buttons[seq].selected = true;
			}
			else if (!new_selection.has(seq) && this.selected_sequences_buttons[seq].selected){
				this.unselectSequence(seq);
				this.selected_sequences_buttons[seq].selected = false;
			}
		}
		this.plot.reloadPlot();
	}
	
	treeNodeStyler(element, data) {
		element.on('click', () => {
			const descendants = this.tree.display.selectAllDescendants(data, true, true);
			if (data[this.selection_id]) {
				this.tree.display.modifySelection(descendants);
				let v = data;
				while (v && v[this.selection_id]) {
					this.tree.display.modifySelection([v]);
					v = v.parent;
				}
			} else {
				this.modifyTreeSelection(descendants);
				this.tree.display.modifySelection([data]);
				let v = data.parent;
				while (v && this.allChildrenSelected(v)) {
					this.tree.display.modifySelection([v]);
					v = v.parent;
				}
			}
    
			const new_selection = this.getTreeSelection();
			this.toggleSankeyPaths(new_selection);
		});
		try{
			let count_class = 0;
			const id = this.selection_id;
			if (data[id]){
				count_class++;
				element.style('fill', this.highlight_color, 'important');
			}
			if (count_class == 0){
				element.style('fill', 'var(--second-color)', 'important');
			}
		}
		catch {
			//
		}
	}
	
	treeEdgeStyler(element, data) {
		try{
			let count_class = 0;
			const id = this.selection_id;
			if (data[id]){
				count_class++;
				element.style('stroke', this.highlight_color, 'important')
					.on('click', ()=>{
						const descendants = this.tree.display.selectAllDescendants(data.target, true, true);
						this.tree.display.modifySelection(descendants);
						this.tree.display.modifySelection([data.target]);
						let v = data.source;
						while (v && v[id] && !this.allChildrenSelected(v)) {
							this.tree.display.modifySelection([v]);
							v = v.parent;
						}
						this.tree.display.update();
						const new_selection = this.getTreeSelection();
						this.toggleSankeyPaths(new_selection);
					});
			}
			else{
				element.on('click', ()=>{
					const descendants = this.tree.display.selectAllDescendants(data.target, true, true);
					this.modifyTreeSelection(descendants);
					this.tree.display.modifySelection([data.target]);
					let v = data.source;
					while (v && this.allChildrenSelected(v)) {
						this.tree.display.modifySelection([v]);
						v = v.parent;
					}
					this.tree.display.update();
					const new_selection = this.getTreeSelection();
					this.toggleSankeyPaths(new_selection);
				});
			}
			if (count_class == 0){
				element.style('stroke', 'var(--dark-second-color)', 'important');
			}
		}
		catch {
			//
		}
	}

	getTreeSelection(){
		const selec = new Set();
		this.tree.getTips().forEach(d => {
			if (d[this.selection_id]){
				selec.add(d.data.name);
			}
		});
		return selec;
	}

	updateTreeSelection(){
		this.tree.display.selectionLabel(this.selection_id);
		this.tree.display.update();
	}

	selectTreeNodes(sequences){
		if (!this.tree){
			return;
		}
		for (const seq of sequences){
			this.selected_sequences_buttons[seq].selected = true;
			const leaf = this.tree.getNodeByName(seq);
			this.tree.display.modifySelection([leaf]);
			let v = leaf.parent;
			while (v && this.allChildrenSelected(v)) {
				this.tree.display.modifySelection([v]);
				v = v.parent;
			}
		}
	}

	unselectTreeNodes(sequences){
		if (!this.tree){
			return;
		}
		const id = this.selection_id;
		for (const seq of sequences){
			this.selected_sequences_buttons[seq].selected = false;
			let v = this.tree.getNodeByName(seq);
			while (v && v[id]) {
				this.tree.display.modifySelection([v]);
				v = v.parent;
			}
		}
	}
	
	removeAll() {
		// -- class state
		this.sequences = undefined;
		this.sequences_names = undefined;
		this.nodes = undefined;
		this.links = undefined;
		this.alignment_matrix_visualization = undefined;
		this.tree = undefined;
		this.selection_id = undefined;
		this.color_scheme = undefined;
		this.plot.removePlot();
		this.plot = undefined;
		this.color_chooser = undefined;
		this.undefined_symbol_color = undefined;
		this.highlight_color  = undefined;
		this.drag_and_drop = undefined;
		this.selected_sequences_buttons  = undefined;
		this.merged = undefined;
		this.rangeMediator = undefined;

		// -- html state
		//event listeners
		const sc = document.getElementById('settings_control');
		sc.replaceWith(sc.cloneNode(true));
		document.querySelectorAll('.item-content').forEach((el)=>{
			el.replaceWith(el.cloneNode(true));
		});
		document.getElementById('sidebar').style.display = 'none';
		document.removeEventListener('keydown', this.keydownCallback);
		// nouislider/bar
		this.slider = undefined;
		const rcw = document.getElementById('range_controls_wrapper');
		rcw.replaceChildren();
		const bar = document.createElement('div');
		bar.id = 'alignment_bar';
		rcw.appendChild(bar);
		// column inputs
		document.getElementById('from_column').value = 1;
		document.getElementById('to_column').value = 6;
		// main checkboxes
		document.getElementById('show_column_lines').checked = false;
		document.getElementById('show_column_numbers').checked = true;
		document.getElementById('linear_gradient_links').checked = false;
		// sankey plot
		document.getElementById('sankey_diagram_container').replaceChildren();
		// buttons and tree
		document.getElementById('for_buttons').replaceChildren();
		const ft = document.getElementById('for_tree');
		ft.replaceChildren();
		ft.style.display = 'none';
		// matrix
		document.getElementById('for_letters').replaceChildren();
		// colors
		document.getElementById('color_chooser_helper').replaceChildren();
		// other checkboxes
		document.getElementById('allow_moving_nodes').checked = true;
		document.getElementById('links_out_of_range').checked = false;
		// merger
		document.getElementById('for_draggable').replaceChildren();
	}
}