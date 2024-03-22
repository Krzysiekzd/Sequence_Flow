/** A class for various sequences processing operations. The methods process sequences and create 
 * the input data for the SankeyPlot.
 */
export class SequenceProcessor{

	static createNodesData(sequences, order_definition){
		// const start = performance.now();
		const nodes = [];
		const undefined_symbols_value = Math.max(...Object.values(order_definition))+1;

		for (let position = 0;position<sequences[0].length;position++){

			const nodes_in_column_set = new Set();
			for (const sequence of sequences){
				nodes_in_column_set.add(sequence[position]);
			}
			nodes_in_column_set.delete('-');

			
			nodes.push(Array.from(nodes_in_column_set).sort((a,b)=>{
				const a_ = order_definition[a];
				const b_ = order_definition[b];
				const a_value =  a_ ? a_ : undefined_symbols_value;
				const b_value = b_ ? b_ : undefined_symbols_value;
				return  a_value - b_value;
			}).map((label)=>{return {label:label};}));
			
		}
		// console.log(`Create nodes data time: ${performance.now()-start}ms`);
		return nodes;
	}

	static createLinksData(sequences, nodes){
		///////////////////// CREATE 'FLOWS DATA'
		const flows = {};
		for (const sequence of sequences){
			// find last nongap index
			let last_nongap_index = 0;
			while (sequence[last_nongap_index]==='-'){
				last_nongap_index++;
			}
	
			// iterate from last nongap index
			for (let column_index=last_nongap_index+1;column_index<sequence.length;column_index++){
				if(sequence[column_index]==='-'){
					continue;
				}
				const pos = `${last_nongap_index},${column_index}`;
				const f = `${sequence[last_nongap_index]},${sequence[column_index]}`;
				if (!(pos in flows)){flows[pos]={};}
				if (!(f in flows[pos])){flows[pos][f]=0;}
				flows[pos][f]+=1;
				last_nongap_index = column_index;
				
			}
		}
		///////////////////// CONVERT 'FLOWS' TO LINKS DATA
		const links = [];
		for (const flow_column in flows){
			const flow_column_arr = flow_column.split(',');
			const from_column = parseInt(flow_column_arr[0]);
			const to_column = parseInt(flow_column_arr[1]);
			for (const flow_nodes in flows[flow_column]){
				const value = flows[flow_column][flow_nodes];
				const flow_nodes_arr = flow_nodes.split(',');
				const from_label = flow_nodes_arr[0];
				const to_label = flow_nodes_arr[1];
				// get node positions of a.a./nucleotides from nodes data based on labels
				let from_position = undefined;
				let to_position = undefined;
				for (const i in nodes[from_column]){
					if (nodes[from_column][i]['label']===from_label){from_position=parseInt(i);}
				}
				for (const i in nodes[to_column]){
					if (nodes[to_column][i]['label']===to_label){to_position=parseInt(i);}
				}
				links.push({from:{column:from_column,node:from_position},to:{column:to_column,node:to_position},value:value});
			}
		}
		return links;
	}

	static createAcidsGroupMap(groups_data){
		return groups_data
			.map((group)=>
				group.acids.reduce((acc,acid_name)=>{return {...acc, [acid_name]: group.name};},{})
			)
			.reduce((acc,obj)=>{return{...acc,...obj};},{});
	}

	static createGroupedNodesData(sequences, groups_data){
		const acids_map = SequenceProcessor.createAcidsGroupMap(groups_data);
		const groups_order = groups_data.map((group)=>group.name).reduce((acc,name,index)=>{return {...acc,[name]:index};},{});
		const columns = [];
	
		for (let position = 0;position<sequences[0].length;position++){
			const groups_set = new Set();
			for (const sequence of sequences){
				const group = acids_map[sequence[position]];
				if (!group){
					continue;
				}
				groups_set.add(group);
			}
			columns.push(
				Array.from(groups_set)
					.sort((a,b)=>{return groups_order[a]-groups_order[b];})
					.map((group)=>{return {label:group};})
			);
		}
		return columns;
	}

	static createGroupedLinksData(sequences, nodes, groups_data){
		const acids_map = SequenceProcessor.createAcidsGroupMap(groups_data);
		// almost the same as create_links_data
		const flows = {};
		for (const sequence of sequences){
			// find last nongap index
			let last_nongap_index = 0;
			while (sequence[last_nongap_index]==='-'){
				last_nongap_index++;
			}
			//iterate from last nongap index
			for (let column_index=last_nongap_index+1;column_index<sequence.length;column_index++){
				if (sequence[column_index]==='-'){
					continue;
				}
				const pos = `${last_nongap_index},${column_index}`;
				const group_1 = acids_map[sequence[last_nongap_index]] ? acids_map[sequence[last_nongap_index]] : sequence[last_nongap_index];
				const group_2 = acids_map[sequence[column_index]] ? acids_map[sequence[column_index]] : sequence[column_index];
	
				const f = `${group_1},${group_2}`;
				if (!(pos in flows)){flows[pos]={};}
				if (!(f in flows[pos])){flows[pos][f]=0;}
				flows[pos][f]+=1;
				last_nongap_index = column_index;
			}
		}
	
		const links = [];
		for (const flow_column in flows){
			const flow_column_arr = flow_column.split(',');
			const from_column = parseInt(flow_column_arr[0]);
			const to_column = parseInt(flow_column_arr[1]);
			for (const flow_nodes in flows[flow_column]){
				const value = flows[flow_column][flow_nodes];
				const flow_nodes_arr = flow_nodes.split(',');
				const from_label = flow_nodes_arr[0];
				const to_label = flow_nodes_arr[1];
				let from_position = undefined;
				let to_position = undefined;
				for (const i in nodes[from_column]){
					if (nodes[from_column][i]['label']===from_label){from_position=parseInt(i);}
				}
				for (const i in nodes[to_column]){
					if (nodes[to_column][i]['label']===to_label){to_position=parseInt(i);}
				}
				links.push({from:{column:from_column,node:from_position},to:{column:to_column,node:to_position},value:value});
			}
		}
	
		return links;
	}
	
}