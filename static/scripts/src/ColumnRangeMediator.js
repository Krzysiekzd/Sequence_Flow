export class ColumnRangeMediator{
	slider;
	inputFrom;
	inputTo;
	columnFrom;
	columnTo;
	length;

	constructor({slider, inputFrom, inputTo, columnFrom, columnTo, length}){
		this.slider = slider;
		this.inputFrom = inputFrom;
		this.inputTo = inputTo;
		this.columnFrom = columnFrom;
		this.columnTo = columnTo;
		this.length = length;
	}

	updateRange({columnFrom, columnTo, source}){
		const newFrom = columnFrom ?? this.columnFrom;
		const newTo = columnTo ?? this.columnTo;

		if (newFrom === this.columnFrom && newTo === this.columnTo){
			return false;
		}
		if (newFrom < 1 || newTo > this.length) {
			return false;
		}

		switch (source){
		case ('slider'): 
			this._updateInputs({newFrom, newTo});
			break;
		case ('key_or_arrow'):
			this._updateInputs({newFrom, newTo});
			this._updateSlider({newFrom, newTo});
			break;
		case ('input'):
			this._updateSlider({newFrom, newTo});
			break;
		}

		this.columnFrom = newFrom;
		this.columnTo = newTo;
		return true;
	}

	getRange(){
		return [this.columnFrom, this.columnTo];
	}

	_updateInputs({newFrom, newTo}){
		this.inputFrom.value = newFrom;
		this.inputTo.value = newTo;
	}

	_updateSlider({newFrom, newTo}){
		this.slider.set([newFrom, newTo]);
	}
}