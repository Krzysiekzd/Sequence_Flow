import { SequenceProcessor } from './SequenceProcessor.js';
import { VisualizationManger } from './VisualizationManager.js';
import { PageManager, Subpage } from './PageManager.js';
import { NUCLEIC_RESIDUES_ORDER, PROTEIN_RESIDUES_ORDER } from './constants/RESIDUES_ORDERS.js';
import { newickParser, phylotree } from 'phylotree';
const main_page_manager = new PageManager();

const visualization_page_button = document.getElementById('visualization_page_button');
const main_page = new Subpage(document.getElementById('main_container_for_main_page'), document.getElementById('main_page_button'), main_page_manager);
const visualization_page = new Subpage(document.getElementById('visualization_page_subpage'), visualization_page_button, main_page_manager);
const manual_page = new Subpage(document.getElementById('manual',), document.getElementById('manual_button'), main_page_manager);
const about_us_page = new Subpage(document.getElementById('about_us'), document.getElementById('about_us_button'), main_page_manager);
document.getElementById('about_the_project_link').addEventListener('click',()=>{
	main_page_manager.changeActivePage(about_us_page);
});
document.getElementById('manual_link').addEventListener('click',()=>{
	main_page_manager.changeActivePage(manual_page);
});
main_page.show();
main_page_manager.active_page = main_page;

const file_input = document.getElementById('alignment_file_input_');
const visualize_button = document.getElementById('visualize_button');
const tree_checkbox = document.getElementById('add_tree_checkbox');
const tree_input_wrapper = document.getElementById('tree_input_wrapper');
const tree_file_input = document.getElementById('tree_file_input');
const example_alignment_button = document.getElementById('example_alignment_button');
const error_div = document.getElementById('file_error');

function handle_visualize_button_state(){
	visualize_button.disabled = true;
	if (!file_input.files[0]){
		return;
	}
	if (tree_checkbox.checked){
		if(!tree_file_input.files[0]){
			return;
		}
	}
	visualize_button.disabled = false;
}

function resetMainPageState(){
	file_input.value = '';
	tree_file_input.value = '';
	error_div.style.display = 'none';
	tree_checkbox.checked = false;
	document.getElementById('check').innerHTML = '';
	document.getElementById('check2').innerHTML = '';
	tree_input_wrapper.style.display = 'none';
	document.getElementById('for_alignment_file_name').textContent = '';
	document.getElementById('for_tree_file_name').textContent = '';
	visualize_button.disabled = true;
}

function getTipsNames(tree){
	const tips_names = [];
	const root = tree.getRootNode();
	const tips = (d) => {
		if (tree.isLeafNode(d)){
			tips_names.push(d.data.name);
		}
		else {
			d.children.forEach(tips);
		}
	};
	tips(root);
	return tips_names;
}

function validate(arr1, arr2){
	return [...arr1].sort().join(',') === [...arr2].sort().join(',');
}

let visualization_manager = undefined;

// sequences_object: key - seq name, value - sequence
function visualize(sequences_object, alignment_type, tree=undefined){
	if (visualization_manager){
		visualization_manager.removeAll();
	}
	let ordered_names = [];

	const sequences_names = Object.keys(sequences_object);
	if (tree) {
		const tips = getTipsNames(tree);
		if(!validate(tips, sequences_names)){
			error_div.textContent = `Error. Alignment sequences names don't match Newick sequences names. 
			Make sure to check if the names don't contain whitespaces.`;
			error_div.style.removeProperty('display');
			visualize_button.disabled = true;
			return;
		}
		ordered_names = tips;
	}

	const sequences_order = {};
	ordered_names.forEach((seq, index)=>{
		sequences_order[seq] = index;
	});

	sequences_names.sort((a,b)=>sequences_order[a]-sequences_order[b]);
	const sequences = sequences_names.map((name)=>sequences_object[name]);
	// document.getElementById('starting_page').style.display = 'none';
	document.getElementById('visualization_page').style.removeProperty('display');
	main_page_manager.changeActivePage(visualization_page);
	visualization_page_button.style.removeProperty('display');

	const order_definition = alignment_type === 'nucleic' 
		? NUCLEIC_RESIDUES_ORDER
		: PROTEIN_RESIDUES_ORDER;

	const nodes = SequenceProcessor.createNodesData(sequences, order_definition);
	const links = SequenceProcessor.createLinksData(sequences, nodes);

	resetMainPageState();

	visualization_manager = new VisualizationManger({
		nodes,
		links,
		alignment_type,
		sequences,
		sequences_names,
		sequences_order,
		tree
	});
}

async function send_sequences_to_server(form, example=false){
	const response = await fetch('/upload_sequences',{
		method:'PUT',
		body: form,
	});

	if (!response.ok){
		const errorResponse = await response.text();
		error_div.textContent=`Error. ${errorResponse}. Verify it and try again.`;
		error_div.style.removeProperty('display');
		return false;
	}

	const sequences_object = await response.json(); 
	if (Object.keys(sequences_object).length<2){
		error_div.textContent = 'Error. The length of the alignment must be greater than one.';
		error_div.style.removeProperty('display');
		return false;
	}

	// visualize call must be moved outside of this scope
	const alignment_type = example ? 'nucleic' : document.getElementById('alignment_type_select').value;

	// check if tree and try to parse
	let tree;
	if (tree_checkbox.checked){
		const file = tree_file_input.files[0];
		const newick_string = await file.text();
		const parsingResult = newickParser(newick_string);
		if (parsingResult.error){
			error_div.textContent = 'Error. Invalid Newick content.';
			error_div.style.removeProperty('display');
			return false;
		}
		tree = new phylotree(newick_string);
	}

	visualize(sequences_object,alignment_type,tree);
}

file_input.addEventListener('change',()=>{
	const for_name = document.getElementById('for_alignment_file_name');
	const check = document.getElementById('check');
	let file_name;

	try {
		file_name = file_input.files[0].name;
		check.innerHTML='&#10003;';
		for_name.textContent = file_name;
		for_name.style.removeProperty('display');
	}
	catch{
		check.innerHTML = '';
		for_name.style.display = 'none';
	}
	handle_visualize_button_state();
});

tree_checkbox.addEventListener('change',(e)=>{
	if (e.target.checked){
		tree_input_wrapper.style.removeProperty('display');
	}
	else {
		tree_input_wrapper.style.display = 'none';
	}
	handle_visualize_button_state();
});

tree_file_input.addEventListener('change',()=>{
	const for_name = document.getElementById('for_tree_file_name');
	const check = document.getElementById('check2');
	let file_name;

	try {
		file_name = tree_file_input.files[0].name;
		check.innerHTML='&#10003;';
		for_name.textContent = file_name;
		for_name.style.removeProperty('display');
		visualize_button.disabled = false;
	}
	catch{
		check.innerHTML = '';
		for_name.style.display = 'none';
		visualize_button.disabled = true;
	}
	handle_visualize_button_state();
});

visualize_button.addEventListener('click',async ()=>{
	const form = new FormData();
	form.append('alignment_file',file_input.files[0]);
	visualize_button.disabled = true;
	await send_sequences_to_server(form);
});

example_alignment_button.addEventListener('click', async (e)=>{

	visualize_button.disabled = true;
	e.target.disabled = true;
	const select = document.getElementById('example_alignment_select');

	const dataset = select.value;

	const alignment_type = select.options[select.selectedIndex].getAttribute('data-alignment-type');
	const response = await fetch(`/get_example/${dataset}`,{
		method:'GET',
	});
	if (!response.ok){
		alert(`EXAMPLE DATASET NOT FOUND ${dataset}`);
		visualize_button.disabled = false;
		e.target.disabled = false;
		return;
	}
	const {sequences, tree:newick_string} = await response.json();
	const tree = newick_string ? new phylotree(newick_string): undefined;
	visualize(sequences, alignment_type, tree);
	e.target.disabled = false;
});

resetMainPageState();
