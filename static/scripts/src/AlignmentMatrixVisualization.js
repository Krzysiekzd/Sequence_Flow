export class AlignmentMatrixVisualization {
	main_dom_element;
	sequences_names;
	first_column;
	last_column;
	constructor({ dom_element, n_sequences, column_height, sequences_names }) {
		this.main_dom_element = dom_element;
		this.main_dom_element.style.gridTemplateRows = `repeat(${n_sequences}, ${column_height})`;
		this.sequences_names = sequences_names;
		this.create();
	}

	create() {
		const letter_info_div = document.getElementById('letter_info_div');
		this.main_dom_element.addEventListener('mouseover', (e) => {
			const [seq_name, col] = this.getAlignmentLetterInfo(
				parseInt(e.target.getAttribute('index'))
			);
			if (!seq_name) {
				return;
			}
			letter_info_div.style.display = 'block';
			letter_info_div.style.bottom = `${
				window.innerHeight - e.target.getBoundingClientRect().top
			}px`;
			letter_info_div.style.left = `${e.target.getBoundingClientRect().left}px`;
			letter_info_div.innerHTML = `<b>${
				e.target.textContent
					? e.target.textContent
					: e.target.getAttribute('content')
			}</b></br> ${seq_name}</br> column ${col}`;
		});
		this.main_dom_element.addEventListener('mouseout', (_) => {
			letter_info_div.style.display = 'none';
		});
	}

	getAlignmentLetterInfo(index) {
		const row = Math.floor(index / (this.last_column - this.first_column));
		return [
			this.sequences_names[row],
			index - row * (this.last_column - this.first_column) + this.first_column,
		];
	}

	displayRange({
		start,
		end,
		symbols_coloring,
		undefined_symbol_color,
		sequences,
		sequences_buttons,
	}) {
		const real_end = end + 1;
		this.first_column = start;
		this.last_column = real_end;
		this.main_dom_element.replaceChildren();
		this.main_dom_element.style.gridTemplateColumns = `repeat(${
			real_end - start
		},1fr)`;
		let index = 0;
		for (const sequence of sequences) {
			for (const letter of sequence.substring(start - 1, real_end - 1)) {
				const element = document.createElement('div');
				element.style.backgroundColor = symbols_coloring[letter]
					? symbols_coloring[letter]
					: undefined_symbol_color;
				real_end - start < 45
					? (element.textContent = letter)
					: element.setAttribute('content', letter);
				element.setAttribute('index', index);
				this.main_dom_element.appendChild(element);
				index += 1;
			}
		}
		this.updateSequencesSelection(sequences_buttons);
	}

	updateSequencesSelection(sequences_buttons) {
		const names = Object.entries(sequences_buttons)
			.map(([name, { selected }]) => (selected ? name : null))
			.filter((name) => name != null);
		for (const name of names) {
			this.selectSequence(name);
		}
	}

	selectSequence(sequenceName) {
		const row_number = this.sequences_names.indexOf(sequenceName);
		const letter_divs = this.main_dom_element.children;
		const columns = this.last_column - this.first_column;
		for (let i = row_number * columns; i < (row_number + 1) * columns; i++) {
			const element = letter_divs[i];
			element.classList.add('highlighted_matrix_element');
		}
	}

	unselectSequence(sequenceName) {
		const row_number = this.sequences_names.indexOf(sequenceName);
		const letter_divs = this.main_dom_element.children;
		const columns = this.last_column - this.first_column;
		for (let i = row_number * columns; i < (row_number + 1) * columns; i++) {
			const element = letter_divs[i];
			element.classList.remove('highlighted_matrix_element');
		}
	}
}
