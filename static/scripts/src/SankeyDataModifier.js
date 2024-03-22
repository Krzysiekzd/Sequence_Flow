/** A class for modifing SankeyPlot data. Each method MUTATES the data. */
export class SankeyDataModifier {

	/** MUTATES links data by selecting the given sequence */
	static selectSequence({sequences, nodes, links, sequence_index, merged=false, acids_labels_groups_map={}}) {
		sequence_index = Number(sequence_index);
		const sequence = sequences[sequence_index];
		let last_nongap_index = 0;
		const sequence_flow = {};

		for (let index=1; index<sequence.length;index++){
			if(sequence[index]==='-'){
				continue;
			}

			const letter_from = sequence[last_nongap_index];
			const letter_to = sequence[index];
			
			sequence_flow[`${last_nongap_index},${index}`] =
					merged ? 
						`${acids_labels_groups_map[letter_from]},${acids_labels_groups_map[letter_to]}`:
						`${letter_from},${letter_to}`;
			last_nongap_index=index;
			
		}
		for (const link of links){
			const from_column = link.from.column;
			const to_column = link.to.column;
			const from_label = nodes[from_column][link.from.node].label;
			const to_label = nodes[to_column][link.to.node].label;

			const link_flow = `${from_column},${to_column}`;

			const sequence_flow_existance = link_flow in sequence_flow;
			const sequence_flow_value_equals = sequence_flow[link_flow] === `${from_label},${to_label}`;

			if (!sequence_flow_existance || !sequence_flow_value_equals){
				continue;
			}

			let number_of_higher_priority_sequences_in_link = 0;

			for (let index=0; index<sequence_index;index++){
				const checked_sequence = sequences[index];
				const possible_gap_substring = checked_sequence.substring(from_column+1,to_column);
				const checked_from_entity = checked_sequence[from_column];
				const checked_to_entity = checked_sequence[to_column];
	
				const entity_from_check = from_label === (merged ? acids_labels_groups_map[checked_from_entity] : checked_from_entity);
				const entity_to_check = to_label === (merged ? acids_labels_groups_map[checked_to_entity] : checked_to_entity);
				if (
					!([entity_from_check,
						entity_to_check ,
						SankeyDataModifier.everyOnString(possible_gap_substring, (letter)=>letter === '-')]
						.every(v=>v))){
					continue;
				}
				number_of_higher_priority_sequences_in_link++;
			}
			if (!('sublinks' in link)){link.sublinks=[];}
			link.sublinks.push({value:1, shift:number_of_higher_priority_sequences_in_link/link.value, sequence_index:sequence_index});
		}
	}

	static everyOnString(string, callback){
		for (const letter of string){
			if (!callback(letter)){
				return false;
			}
		}
		return true;
	}

	/** MUTATES links data by unselecting the given sequence */
	static unselectSequence({links, sequence_index}){
		for (const link of links){ 
			if ('sublinks' in link){
				const sublinks = link.sublinks;
				let to_delete = undefined;
				for (const index in sublinks){
					if (sublinks[index].sequence_index===sequence_index){
						to_delete = index;
						break;
					}
				}
				if (to_delete){
					sublinks.splice(to_delete,1);
					if (sublinks.length === 0){
						delete link.sublinks;
					}
				}
			}
		}
	}

	/** MUTATES links data by unselecting ALL sequences */
	static unselectAllSequences(links){
		for (const link of links){
			delete link.sublinks;
		}
	}
}