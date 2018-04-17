var Animator = (function () {
'use strict';

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var siteswap = createCommonjsModule(function (module, exports) {
(function(f){{module.exports=f();}})(function(){var define,module,exports;module={exports:(exports={})};
'use strict';

// Validates the siteswap for collisions. Assumes that throws sequence structure is valid.

function validate( throws ){

	const balance = throws.map( action => action.map(release => 0) );

	for( let beat = 0; beat < throws.length; beat++ ){

		const action = throws[beat];
		for( const release of action ){
			for( const toss of release ){
				// Outgoing toss counts.
				balance[beat][toss.handFrom]++;

				// Incoming toss counts.
				balance[(beat + toss.value) % throws.length][toss.handTo]--;
			}
		}
	}

	if( balance.some(action => action.some(count => count !== 0)) )
		throw new Error("Invalid siteswap.");

}

function equalThrowSequence( throws1, throws2 ){

   if( throws1.length !== throws2.length )
      return false;

   for( let i = 0; i < throws1.length; i++ ){
      const action1 = throws1[i];
      const action2 = throws2[i];
      if( action1.length !== action2.length )
         return false;

      for( let j = 0; j < action1.length; j++ ){
         const release1 = action1[j];
         const release2 = action2[j];
         if( release1.length !== release2.length )
            return false;

         for( let k = 0; k < release1.length; k++ ){
            const toss1 = release1[k];
            const toss2 = release2[k];
            if( toss1.value !== toss2.value || toss1.handFrom !== toss2.handFrom || toss1.handTo !== toss2.handTo )
               return false;
         }
      }
   }

   return true;

}

function truncate( throws ){

   for( let i = 1, n = Math.floor(throws.length / 2); i <= n; i++ ){

      if( throws.length % i === 0 ){
         const sample1 = throws.slice(0, i);
         for( let j = i; j < throws.length; j += i ){
            const sample2 = throws.slice(j, j + i);

            if( !equalThrowSequence(sample1, sample2) ){
               break;
            }
            if( i + j === throws.length ){
               throws.length = i;
               return;
            }
         }
      }
   }

}

function advance( action ){

   const greatestValue = this.schedule[0].length;
   if( greatestValue === 0 )
      return this;

   const schedule = [];
   if( this.strict ){
      schedule.push( ...this.schedule.map(handState => [...handState.slice(1).map(balls => balls.slice()), []]) );
   }
   else{
      schedule.push( ...this.schedule.map(handState => [...handState.slice(1), 0]) );
   }

   for( const release of action ){
      for( let i = 0; i < release.length; i++ ){
         const toss = release[i];
         if( toss.value > 0 ){
            if( this.strict ){
               const ball = this.schedule[toss.handFrom][0][i];
               schedule[toss.handTo][toss.value - 1].push(ball);
            }
            else{
               schedule[toss.handTo][toss.value - 1]++;
            }
         }
      }
   }

   return new State(schedule, this.strict);

}

function equals( state ){

   if( this.strict !== state.strict )
      return false;

   const s1 = this.schedule;
   const s2 = state.schedule;
   
   if( s1.length !== s2.length )
      return false;

   for( let hand = 0; hand < s1.length; hand++ ){
      if( s1[hand].length !== s2[hand].length )
         return false;

      for( let beat = 0; beat < s1[hand].length; beat++ ){

         if( this.strict ){
            if( s1[hand][beat].length !== s2[hand][beat].length )
               return false;

            for( let ball = 0; ball < s1[hand][beat].length; ball++ )
               if( s1[hand][beat][ball] !== s2[hand][beat][ball] )
                  return false;
         }
         else{
            if( s1[hand][beat] !== s2[hand][beat] )
               return false;
         }

      }
   }

   return true;

}

function isExcited(){

   let props;
   if( this.strict ){
      props = this.schedule.reduce( (sum, handState) => sum + handState.reduce((sum, beatState) => sum + beatState.length, 0), 0 );
   }
   else{
      props = this.schedule.reduce( (sum, handState) => sum + handState.reduce((sum, beatState) => sum + beatState, 0), 0 );
   }

   const hands = this.schedule.length;
   const greatestValue = this.schedule[0].length;
   const saturated = Math.floor(props / hands);
   let excess = props % hands;

   if( !this.strict ){
      for( let i = 0; i < hands; i++ ){
         for( let j = 0; j < saturated; j++ )
            if( this.schedule[i][j] !== 1 )
               return true;

         const filled = this.schedule[i][saturated] === 1 ? 1 : 0;
         for( let j = saturated + filled; j < greatestValue; j++ )
            if( this.schedule[i][j] !== 0 )
               return true;
         excess -= filled;
      }
   }

   else{
      for( let i = 0; i < hands; i++ ){
         for( let j = 0; j < saturated; j++ )
            if( this.schedule[i][j].length !== 1 )
               return true;

         if( saturated === greatestValue )
            continue;

         const filled = this.schedule[i][saturated].length === 1 ? 1 : 0;
         for( let j = saturated + filled; j < greatestValue; j++ )
            if( this.schedule[i][j].length !== 0 )
               return true;
         excess -= filled;
      }
   }

   return excess !== 0;

}

// I'm not satisfied with the state of `State`, but being a temporary solution
// until the graph content is introduced, it can remain as is.

// `strict`ness should be removed from state if it's not used at all by the graph,
// and the `.strictStates` of a siteswap should be derived from the normal states.

class State {

   constructor( source, strict = false ){

      let schedule;

      // Find initial state of a given siteswap.
      if( source instanceof Array ){

         schedule = source;      

      }
      else if( source instanceof Siteswap ){

         schedule = [];

         const siteswap = source;
         for( let i = 0; i < siteswap.degree; i++ ){
            schedule.push( Array(siteswap.greatestValue).fill(0) );
         }

         let found = 0;
         for( let beat = -1; found < siteswap.props; beat-- ){
            const action = siteswap.throws[((beat % siteswap.throws.length) + siteswap.throws.length) % siteswap.throws.length];
            for( const release of action ){
               for( const toss of release ){
                  if( beat + toss.value >= 0 ){
                     schedule[toss.handTo][beat + toss.value]++;
                     found++;
                  }
               }
            }
         }

         if( strict ){
            let ball = 0;
            for( let i = 0; i < siteswap.degree; i++ )
               schedule[i] = schedule[i].map( c => Array(c).fill().map(() => ++ball) );
         }

      }
      else{
         throw new Error("Invalid input.")
      }

      this.schedule = schedule;
      this.strict = strict;
      this.ground = !this.isExcited();

   }

}

State.prototype.advance = advance;
State.prototype.equals = equals;
State.prototype.isExcited = isExcited;

function schedulise( throws, strict ){

	const states = [ new State(this, strict) ];

	do {
		for( const action of throws )
			states.push( states[states.length - 1].advance(action) );
	} while( !states[0].equals(states[states.length - 1]) );

	states.pop();

	return states;

}

function mark( orbit, map, throws, i, j ){

	const release = throws[i][j];
	for( const toss of release ){

		if( toss.value === 0 )
			continue;

		const beat = (i + toss.value) % throws.length;
		if( map[beat][toss.handTo] === orbit )
			continue;

		map[beat][toss.handTo] = orbit;
		mark( orbit, map, throws, beat, toss.handTo );
	}

}


function orbitise( throws, notation ){

	const orbits = [];

	// Maps tosses to orbits.
	const map = throws.map( action => action.map(release => null) );
	for( let i = 0; i < throws.length; i++ ){
		const action = throws[i];
		for( let j = 0; j < action.length; j++ ){

			const release = action[j];
			if( map[i][j] === null && !(release.length === 1 && release[0].value === 0) ){
				const orbit = [];
				mark( orbit, map, throws, i, j );
				orbits.push(orbit);
			}
		}
	}

	if( orbits.length === 1 )
		return [this];

	for( let i = 0; i < throws.length; i++ ){
		const action = throws[i];
		for( const orbit of orbits )
			orbit.push( action.map( (release, j) => map[i][j] === orbit ? release : [{ value: 0, handFrom: j, handTo: j }] ) );
	}

	return orbits.map( orbit => new Siteswap(orbit, notation) );

}

// This is far from efficient as states are repeatedly compared with `.equals()`. I could map states to numbers,
// but that would be a temporary solution until the graph content arrives. Then, a map/array of known states will 
// be used, and `.equals()` will deal with references, not deep comparisons.

// Also, should siteswap repetitions be included in `.composition`? Right now, they are.

function decompose( states, throws, notation ){

	const composition = [];

   let last = 0;
	for( let to = 1; to <= states.length; to++ ){

		for( let from = to - 1; from >= last; from-- ){
			if( states[to % states.length].equals(states[from]) ){

            // Prime siteswap.
				if( from === 0 && to === states.length ){
					return [this];
				}

            // Composite siteswaps, no transition.
            if( last === from ){
               composition.push( new Siteswap(throws.slice(from, to), notation) );
               last = to;
               break;
            }

            // Composite siteswaps with transition.
            const strippedThrows = [...throws];
            const strippedStates = [...states];

            composition.push( new Siteswap(strippedThrows.splice(from, to - from), notation) );
            strippedStates.splice(from, to - from);

            return composition.concat( decompose( strippedStates.slice(last), strippedThrows.slice(last), notation ) );
			}
		}

	}

	return composition;

}

function Rule(name, symbols, postprocess) {
    this.id = ++Rule.highestId;
    this.name = name;
    this.symbols = symbols;        // a list of literal | regex class | nonterminal
    this.postprocess = postprocess;
    return this;
}
Rule.highestId = 0;

Rule.prototype.toString = function(withCursorAt) {
    function stringifySymbolSequence (e) {
        return e.literal ? JSON.stringify(e.literal) :
               e.type ? '%' + e.type : e.toString();
    }
    var symbolSequence = (typeof withCursorAt === "undefined")
                         ? this.symbols.map(stringifySymbolSequence).join(' ')
                         : (   this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ')
                             + " ● "
                             + this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' ')     );
    return this.name + " → " + symbolSequence;
};


// a State is a rule at a position from a given starting point in the input stream (reference)
function State$1(rule, dot, reference, wantedBy) {
    this.rule = rule;
    this.dot = dot;
    this.reference = reference;
    this.data = [];
    this.wantedBy = wantedBy;
    this.isComplete = this.dot === rule.symbols.length;
}

State$1.prototype.toString = function() {
    return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
};

State$1.prototype.nextState = function(child) {
    var state = new State$1(this.rule, this.dot + 1, this.reference, this.wantedBy);
    state.left = this;
    state.right = child;
    if (state.isComplete) {
        state.data = state.build();
    }
    return state;
};

State$1.prototype.build = function() {
    var children = [];
    var node = this;
    do {
        children.push(node.right.data);
        node = node.left;
    } while (node.left);
    children.reverse();
    return children;
};

State$1.prototype.finish = function() {
    if (this.rule.postprocess) {
        this.data = this.rule.postprocess(this.data, this.reference, Parser.fail);
    }
};


function Column(grammar, index) {
    this.grammar = grammar;
    this.index = index;
    this.states = [];
    this.wants = {}; // states indexed by the non-terminal they expect
    this.scannable = []; // list of states that expect a token
    this.completed = {}; // states that are nullable
}


Column.prototype.process = function(nextColumn) {
    var states = this.states;
    var wants = this.wants;
    var completed = this.completed;

    for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
        var state = states[w];

        if (state.isComplete) {
            state.finish();
            if (state.data !== Parser.fail) {
                // complete
                var wantedBy = state.wantedBy;
                for (var i = wantedBy.length; i--; ) { // this line is hot
                    var left = wantedBy[i];
                    this.complete(left, state);
                }

                // special-case nullables
                if (state.reference === this.index) {
                    // make sure future predictors of this rule get completed.
                    var exp = state.rule.name;
                    (this.completed[exp] = this.completed[exp] || []).push(state);
                }
            }

        } else {
            // queue scannable states
            var exp = state.rule.symbols[state.dot];
            if (typeof exp !== 'string') {
                this.scannable.push(state);
                continue;
            }

            // predict
            if (wants[exp]) {
                wants[exp].push(state);

                if (completed.hasOwnProperty(exp)) {
                    var nulls = completed[exp];
                    for (var i = 0; i < nulls.length; i++) {
                        var right = nulls[i];
                        this.complete(state, right);
                    }
                }
            } else {
                wants[exp] = [state];
                this.predict(exp);
            }
        }
    }
};

Column.prototype.predict = function(exp) {
    var rules = this.grammar.byName[exp] || [];

    for (var i = 0; i < rules.length; i++) {
        var r = rules[i];
        var wantedBy = this.wants[exp];
        var s = new State$1(r, 0, this.index, wantedBy);
        this.states.push(s);
    }
};

Column.prototype.complete = function(left, right) {
    var inp = right.rule.name;
    if (left.rule.symbols[left.dot] === inp) {
        var copy = left.nextState(right);
        this.states.push(copy);
    }
};


function Grammar(rules, start) {
    this.rules = rules;
    this.start = start || this.rules[0].name;
    var byName = this.byName = {};
    this.rules.forEach(function(rule) {
        if (!byName.hasOwnProperty(rule.name)) {
            byName[rule.name] = [];
        }
        byName[rule.name].push(rule);
    });
}

// So we can allow passing (rules, start) directly to Parser for backwards compatibility
Grammar.fromCompiled = function(rules, start) {
    var lexer = rules.Lexer;
    if (rules.ParserStart) {
      start = rules.ParserStart;
      rules = rules.ParserRules;
    }
    var rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
    var g = new Grammar(rules, start);
    g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
    return g;
};


function StreamLexer() {
  this.reset("");
}

StreamLexer.prototype.reset = function(data, state) {
    this.buffer = data;
    this.index = 0;
    this.line = state ? state.line : 1;
    this.lastLineBreak = state ? -state.col : 0;
};

StreamLexer.prototype.next = function() {
    if (this.index < this.buffer.length) {
        var ch = this.buffer[this.index++];
        if (ch === '\n') {
          this.line += 1;
          this.lastLineBreak = this.index;
        }
        return {value: ch};
    }
};

StreamLexer.prototype.save = function() {
  return {
    line: this.line,
    col: this.index - this.lastLineBreak,
  }
};

StreamLexer.prototype.formatError = function(token, message) {
    // nb. this gets called after consuming the offending token,
    // so the culprit is index-1
    var buffer = this.buffer;
    if (typeof buffer === 'string') {
        var nextLineBreak = buffer.indexOf('\n', this.index);
        if (nextLineBreak === -1) nextLineBreak = buffer.length;
        var line = buffer.substring(this.lastLineBreak, nextLineBreak);
        var col = this.index - this.lastLineBreak;
        message += " at line " + this.line + " col " + col + ":\n\n";
        message += "  " + line + "\n";
        message += "  " + Array(col).join(" ") + "^";
        return message;
    } else {
        return message + " at index " + (this.index - 1);
    }
};


function Parser(rules, start, options) {
    if (rules instanceof Grammar) {
        var grammar = rules;
        var options = start;
    } else {
        var grammar = Grammar.fromCompiled(rules, start);
    }
    this.grammar = grammar;

    // Read options
    this.options = {
        keepHistory: false,
        lexer: grammar.lexer || new StreamLexer,
    };
    for (var key in (options || {})) {
        this.options[key] = options[key];
    }

    // Setup lexer
    this.lexer = this.options.lexer;
    this.lexerState = undefined;

    // Setup a table
    var column = new Column(grammar, 0);
    var table = this.table = [column];

    // I could be expecting anything.
    column.wants[grammar.start] = [];
    column.predict(grammar.start);
    // TODO what if start rule is nullable?
    column.process();
    this.current = 0; // token index
}

// create a reserved token for indicating a parse fail
Parser.fail = {};

Parser.prototype.feed = function(chunk) {
    var lexer = this.lexer;
    lexer.reset(chunk, this.lexerState);

    var token;
    while (token = lexer.next()) {
        // We add new states to table[current+1]
        var column = this.table[this.current];

        // GC unused states
        if (!this.options.keepHistory) {
            delete this.table[this.current - 1];
        }

        var n = this.current + 1;
        var nextColumn = new Column(this.grammar, n);
        this.table.push(nextColumn);

        // Advance all tokens that expect the symbol
        var literal = token.value;
        var value = lexer.constructor === StreamLexer ? token.value : token;
        var scannable = column.scannable;
        for (var w = scannable.length; w--; ) {
            var state = scannable[w];
            var expect = state.rule.symbols[state.dot];
            // Try to consume the token
            // either regex or literal
            if (expect.test ? expect.test(value) :
                expect.type ? expect.type === token.type
                            : expect.literal === literal) {
                // Add it
                var next = state.nextState({data: value, token: token, isToken: true, reference: n - 1});
                nextColumn.states.push(next);
            }
        }

        // Next, for each of the rules, we either
        // (a) complete it, and try to see if the reference row expected that
        //     rule
        // (b) predict the next nonterminal it expects by adding that
        //     nonterminal's start state
        // To prevent duplication, we also keep track of rules we have already
        // added

        nextColumn.process();

        // If needed, throw an error:
        if (nextColumn.states.length === 0) {
            // No states at all! This is not good.
            var message = this.lexer.formatError(token, "invalid syntax") + "\n";
            message += "Unexpected " + (token.type ? token.type + " token: " : "");
            message += JSON.stringify(token.value !== undefined ? token.value : token) + "\n";
            var err = new Error(message);
            err.offset = this.current;
            err.token = token;
            throw err;
        }

        // maybe save lexer state
        if (this.options.keepHistory) {
          column.lexerState = lexer.save();
        }

        this.current++;
    }
    if (column) {
      this.lexerState = lexer.save();
    }

    // Incrementally keep track of results
    this.results = this.finish();

    // Allow chaining, for whatever it's worth
    return this;
};

Parser.prototype.save = function() {
    var column = this.table[this.current];
    column.lexerState = this.lexerState;
    return column;
};

Parser.prototype.restore = function(column) {
    var index = column.index;
    this.current = index;
    this.table[index] = column;
    this.table.splice(index + 1);
    this.lexerState = column.lexerState;

    // Incrementally keep track of results
    this.results = this.finish();
};

// nb. deprecated: use save/restore instead!
Parser.prototype.rewind = function(index) {
    if (!this.options.keepHistory) {
        throw new Error('set option `keepHistory` to enable rewinding')
    }
    // nb. recall column (table) indicies fall between token indicies.
    //        col 0   --   token 0   --   col 1
    this.restore(this.table[index]);
};

Parser.prototype.finish = function() {
    // Return the possible parsings
    var considerations = [];
    var start = this.grammar.start;
    var column = this.table[this.table.length - 1];
    column.states.forEach(function (t) {
        if (t.rule.name === start
                && t.dot === t.rule.symbols.length
                && t.reference === 0
                && t.data !== Parser.fail) {
            considerations.push(t);
        }
    });
    return considerations.map(function(c) {return c.data; });
};

function alphabetic( degree ){

  const offset = "A".charCodeAt(0);
  const count = "Z".charCodeAt(0) - offset + 1;

  return range(degree).map( (hand, i) => range(Math.floor(i / count)).map(key => String.fromCharCode(offset + key % count)).concat(String.fromCharCode(offset + i % count)).join("") );
  
}

function range( n ){

  return [...Array(n).keys()];
  
}

// Generated automatically by nearley
// http://github.com/Hardmath123/nearley
function id(x) {return x[0]; }


function mirror( throws ){

   return throws.concat( throws.map( action => action.map( release => release.map(({ value, cross }) => ({ value, cross })) ).reverse() ));

}

function numerify( letter ){

   if( letter < "a" )
      return letter.charCodeAt(0) - "A".charCodeAt(0) + 36;
   else
      return letter.charCodeAt(0) - "a".charCodeAt(0) + 10;

}

function finaliseAsync( throws ){

   return throws.map( ([release]) => [release.map( ({value}) => ({ value, handFrom: 0, handTo: 0 }) )] );

}

function finaliseSync( throws ){

   return throws.map( action => action.map((release, i) => release.map( ({value, cross}) => ({ value: value / 2, handFrom: i, handTo: cross ? 1 - i : i }) )) );

}

function finalisePassingAsync( siteswaps ){

   const choice = new Choice();
   const period = siteswaps.map(({length}) => length).reduce(lcm);
   const throws = [];
   for( let i = 0; i < period; i++ ){
      const action = siteswaps.map(actions => actions[i % actions.length][0]).map(function(release, handFrom){
         return release.map(function({value, pass}){
            if( pass ){
               choice.pick(typeof pass);
               if( pass === true )
                  pass = 2 - handFrom;
            }
            const handTo = !pass ? handFrom : (pass - 1);
            return { value, handFrom, handTo };
         })
      });
      throws.push( action );
   }
   return throws;

}

function finalisePassingSync( siteswaps ){

   const choice = new Choice();
   const period = siteswaps.map(({length}) => length).reduce(lcm);
   const throws = [];
   for( let i = 0; i < period; i++ ){
      const action = Array.prototype.concat( ...siteswaps.map(siteswap => siteswap[i % siteswap.length]) ).map(function(release, handFrom){
         return release.map(function({value, pass, cross}){
            if( pass ){
               choice.pick(typeof pass);
               if( pass === true )
                  pass = 2 - Math.floor(handFrom / 2);
            }
            const handTo = (pass ? ((pass - 1) * 2 + handFrom % 2) : handFrom) + (cross ? (handFrom % 2 ? -1 : 1) : 0);
            return { value: value / 2, handFrom, handTo };
         })
      });
      throws.push( action );
   }
   return throws;

}




function finaliseMultihand( rows ){

   const hands = alphabetic(rows.length);
   const period = rows.map(({length}) => length).reduce(lcm);
   const throws = [];
   for( let i = 0; i < period; i++ ){
      const action = rows.map(row => row[i % row.length]).map(function(release, handFrom){
         return release.map(function({ value, hand, offset }){
            const handTo = hand ? hands.indexOf(hand) : (handFrom + offset);
            return { value, handFrom, handTo };
         });
      });
      throws.push( action );
   }
   return throws;
   
}

function lcm( a, b ){

   const greater = Math.max(a, b);
   const smaller = Math.min(a, b);
   let result = greater;
   while( result % smaller !== 0 )
      result += greater;
   return result;

}

class Choice {

   pick( value ){

      if( !this.hasOwnProperty("value") )
         this.value = value;
      else if( this.value !== value )
         throw new Error("Consistency, please.");

   }

}

var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "digit", "symbols": [/[0-9]/], "postprocess": ([match]) => Number(match)},
    {"name": "digit_even", "symbols": [/[02468]/], "postprocess": ([match]) => Number(match)},
    {"name": "letter", "symbols": [/[a-zA-Z]/], "postprocess": id},
    {"name": "letter_capital", "symbols": [/[A-Z]/], "postprocess": id},
    {"name": "letter_even", "symbols": [/[acegikmoqsuwyACEGIKMOQSUWY]/], "postprocess": id},
    {"name": "integer", "symbols": [/[0-9]/], "postprocess": ([match]) => Number(match)},
    {"name": "integer$e$1", "symbols": [/[0-9]/]},
    {"name": "integer$e$1", "symbols": ["integer$e$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "integer", "symbols": [/[1-9]/, "integer$e$1"], "postprocess": ([first, rest]) => Number([first, ...rest].join(""))},
    {"name": "integer_even", "symbols": [/[02468]/], "postprocess": ([match]) => Number(match)},
    {"name": "integer_even$e$1", "symbols": []},
    {"name": "integer_even$e$1", "symbols": ["integer_even$e$1", /[0-9]/], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "integer_even", "symbols": [/[1-9]/, "integer_even$e$1", /[02468]/], "postprocess": ([first, rest, last]) => Number([first, ...rest, last].join(""))},
    {"name": "cross", "symbols": [{"literal":"x"}], "postprocess": () => true},
    {"name": "crosspass", "symbols": [{"literal":"p"}], "postprocess": () => true},
    {"name": "pass", "symbols": [{"literal":"p"}, "integer"], "postprocess": ([, target]) => target},
    {"name": "_$e$1", "symbols": []},
    {"name": "_$e$1", "symbols": ["_$e$1", {"literal":" "}], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$e$1"], "postprocess": () => null},
    {"name": "standard_async$m$2$m$2", "symbols": ["standard_async_toss"]},
    {"name": "standard_async$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "standard_async$m$2$m$1", "symbols": ["standard_async$m$2$m$2"], "postprocess": id},
    {"name": "standard_async$m$2$m$1$e$1$s$1", "symbols": ["_", "standard_async$m$2$m$3", "_", "standard_async$m$2$m$2"]},
    {"name": "standard_async$m$2$m$1$e$1", "symbols": ["standard_async$m$2$m$1$e$1$s$1"]},
    {"name": "standard_async$m$2$m$1$e$1$s$2", "symbols": ["_", "standard_async$m$2$m$3", "_", "standard_async$m$2$m$2"]},
    {"name": "standard_async$m$2$m$1$e$1", "symbols": ["standard_async$m$2$m$1$e$1", "standard_async$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "standard_async$m$2$m$1", "symbols": [{"literal":"["}, "_", "standard_async$m$2$m$2", "standard_async$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "standard_async$m$2", "symbols": ["standard_async$m$2$m$1"]},
    {"name": "standard_async$m$3", "symbols": [{"literal":","}]},
    {"name": "standard_async$m$1$m$2$m$2", "symbols": ["standard_async$m$2"]},
    {"name": "standard_async$m$1$m$2$m$3", "symbols": ["standard_async$m$3"]},
    {"name": "standard_async$m$1$m$2$m$1$e$1", "symbols": []},
    {"name": "standard_async$m$1$m$2$m$1$e$1$s$1", "symbols": ["_", "standard_async$m$1$m$2$m$3", "_", "standard_async$m$1$m$2$m$2"]},
    {"name": "standard_async$m$1$m$2$m$1$e$1", "symbols": ["standard_async$m$1$m$2$m$1$e$1", "standard_async$m$1$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "standard_async$m$1$m$2$m$1", "symbols": ["standard_async$m$1$m$2$m$2", "standard_async$m$1$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "standard_async$m$1$m$2", "symbols": ["standard_async$m$1$m$2$m$1"]},
    {"name": "standard_async$m$1$m$1", "symbols": ["_", "standard_async$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "standard_async$m$1", "symbols": ["standard_async$m$1$m$1"], "postprocess": id},
    {"name": "standard_async", "symbols": ["standard_async$m$1"], "postprocess": ([throws])  => finaliseAsync(throws)},
    {"name": "standard_async$m$5$m$2", "symbols": ["standard_async_toss"]},
    {"name": "standard_async$m$5$m$3", "symbols": [{"literal":" "}]},
    {"name": "standard_async$m$5$m$1", "symbols": ["standard_async$m$5$m$2"], "postprocess": id},
    {"name": "standard_async$m$5$m$1$e$1$s$1", "symbols": ["_", "standard_async$m$5$m$3", "_", "standard_async$m$5$m$2"]},
    {"name": "standard_async$m$5$m$1$e$1", "symbols": ["standard_async$m$5$m$1$e$1$s$1"]},
    {"name": "standard_async$m$5$m$1$e$1$s$2", "symbols": ["_", "standard_async$m$5$m$3", "_", "standard_async$m$5$m$2"]},
    {"name": "standard_async$m$5$m$1$e$1", "symbols": ["standard_async$m$5$m$1$e$1", "standard_async$m$5$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "standard_async$m$5$m$1", "symbols": [{"literal":"["}, "_", "standard_async$m$5$m$2", "standard_async$m$5$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "standard_async$m$5", "symbols": ["standard_async$m$5$m$1"]},
    {"name": "standard_async$m$6", "symbols": [{"literal":" "}]},
    {"name": "standard_async$m$4$m$2$m$2", "symbols": ["standard_async$m$5"]},
    {"name": "standard_async$m$4$m$2$m$3", "symbols": ["standard_async$m$6"]},
    {"name": "standard_async$m$4$m$2$m$1$e$1", "symbols": []},
    {"name": "standard_async$m$4$m$2$m$1$e$1$s$1", "symbols": ["_", "standard_async$m$4$m$2$m$3", "_", "standard_async$m$4$m$2$m$2"]},
    {"name": "standard_async$m$4$m$2$m$1$e$1", "symbols": ["standard_async$m$4$m$2$m$1$e$1", "standard_async$m$4$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "standard_async$m$4$m$2$m$1", "symbols": ["standard_async$m$4$m$2$m$2", "standard_async$m$4$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "standard_async$m$4$m$2", "symbols": ["standard_async$m$4$m$2$m$1"]},
    {"name": "standard_async$m$4$m$1", "symbols": ["_", "standard_async$m$4$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "standard_async$m$4", "symbols": ["standard_async$m$4$m$1"], "postprocess": id},
    {"name": "standard_async", "symbols": ["standard_async$m$4"], "postprocess": ([throws])  => finaliseAsync(throws)},
    {"name": "standard_async_toss", "symbols": ["integer"], "postprocess": ([value]) => ({ value })},
    {"name": "standard_sync$m$2$m$2", "symbols": ["standard_sync_toss"]},
    {"name": "standard_sync$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "standard_sync$m$2$m$1", "symbols": ["standard_sync$m$2$m$2"], "postprocess": id},
    {"name": "standard_sync$m$2$m$1$e$1$s$1", "symbols": ["_", "standard_sync$m$2$m$3", "_", "standard_sync$m$2$m$2"]},
    {"name": "standard_sync$m$2$m$1$e$1", "symbols": ["standard_sync$m$2$m$1$e$1$s$1"]},
    {"name": "standard_sync$m$2$m$1$e$1$s$2", "symbols": ["_", "standard_sync$m$2$m$3", "_", "standard_sync$m$2$m$2"]},
    {"name": "standard_sync$m$2$m$1$e$1", "symbols": ["standard_sync$m$2$m$1$e$1", "standard_sync$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "standard_sync$m$2$m$1", "symbols": [{"literal":"["}, "_", "standard_sync$m$2$m$2", "standard_sync$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "standard_sync$m$2", "symbols": ["standard_sync$m$2$m$1"]},
    {"name": "standard_sync$m$3", "symbols": [{"literal":","}]},
    {"name": "standard_sync$m$1$m$2$s$1$m$2$m$2", "symbols": ["standard_sync$m$2"]},
    {"name": "standard_sync$m$1$m$2$s$1$m$2$m$3", "symbols": ["standard_sync$m$3"]},
    {"name": "standard_sync$m$1$m$2$s$1$m$2$m$1", "symbols": [{"literal":"("}, "_", "standard_sync$m$1$m$2$s$1$m$2$m$2", "_", "standard_sync$m$1$m$2$s$1$m$2$m$3", "_", "standard_sync$m$1$m$2$s$1$m$2$m$2", "_", {"literal":")"}], "postprocess": ([, , [[release1]], , , , [[release2]]]) => [release1, release2]},
    {"name": "standard_sync$m$1$m$2$s$1$m$2", "symbols": ["standard_sync$m$1$m$2$s$1$m$2$m$1"]},
    {"name": "standard_sync$m$1$m$2$s$1$m$3", "symbols": ["_"]},
    {"name": "standard_sync$m$1$m$2$s$1$m$1$e$1", "symbols": []},
    {"name": "standard_sync$m$1$m$2$s$1$m$1$e$1$s$1", "symbols": ["standard_sync$m$1$m$2$s$1$m$3", "standard_sync$m$1$m$2$s$1$m$2"]},
    {"name": "standard_sync$m$1$m$2$s$1$m$1$e$1", "symbols": ["standard_sync$m$1$m$2$s$1$m$1$e$1", "standard_sync$m$1$m$2$s$1$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "standard_sync$m$1$m$2$s$1$m$1", "symbols": ["standard_sync$m$1$m$2$s$1$m$2", "standard_sync$m$1$m$2$s$1$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "standard_sync$m$1$m$2$s$1$e$1", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "standard_sync$m$1$m$2$s$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "standard_sync$m$1$m$2$s$1", "symbols": ["standard_sync$m$1$m$2$s$1$m$1", "_", "standard_sync$m$1$m$2$s$1$e$1"]},
    {"name": "standard_sync$m$1$m$2", "symbols": ["standard_sync$m$1$m$2$s$1"]},
    {"name": "standard_sync$m$1$m$1", "symbols": ["_", "standard_sync$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "standard_sync$m$1", "symbols": ["standard_sync$m$1$m$1"], "postprocess": ([[actions, , mirrored]]) => mirrored ? mirror(actions) : actions},
    {"name": "standard_sync", "symbols": ["standard_sync$m$1"], "postprocess": ([throws]) => finaliseSync(throws)},
    {"name": "standard_sync$m$5$m$2", "symbols": ["standard_sync_toss"]},
    {"name": "standard_sync$m$5$m$3", "symbols": [{"literal":" "}]},
    {"name": "standard_sync$m$5$m$1", "symbols": ["standard_sync$m$5$m$2"], "postprocess": id},
    {"name": "standard_sync$m$5$m$1$e$1$s$1", "symbols": ["_", "standard_sync$m$5$m$3", "_", "standard_sync$m$5$m$2"]},
    {"name": "standard_sync$m$5$m$1$e$1", "symbols": ["standard_sync$m$5$m$1$e$1$s$1"]},
    {"name": "standard_sync$m$5$m$1$e$1$s$2", "symbols": ["_", "standard_sync$m$5$m$3", "_", "standard_sync$m$5$m$2"]},
    {"name": "standard_sync$m$5$m$1$e$1", "symbols": ["standard_sync$m$5$m$1$e$1", "standard_sync$m$5$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "standard_sync$m$5$m$1", "symbols": [{"literal":"["}, "_", "standard_sync$m$5$m$2", "standard_sync$m$5$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "standard_sync$m$5", "symbols": ["standard_sync$m$5$m$1"]},
    {"name": "standard_sync$m$6", "symbols": [{"literal":" "}]},
    {"name": "standard_sync$m$4$m$2$s$1$m$2$m$2", "symbols": ["standard_sync$m$5"]},
    {"name": "standard_sync$m$4$m$2$s$1$m$2$m$3", "symbols": ["standard_sync$m$6"]},
    {"name": "standard_sync$m$4$m$2$s$1$m$2$m$1", "symbols": [{"literal":"("}, "_", "standard_sync$m$4$m$2$s$1$m$2$m$2", "_", "standard_sync$m$4$m$2$s$1$m$2$m$3", "_", "standard_sync$m$4$m$2$s$1$m$2$m$2", "_", {"literal":")"}], "postprocess": ([, , [[release1]], , , , [[release2]]]) => [release1, release2]},
    {"name": "standard_sync$m$4$m$2$s$1$m$2", "symbols": ["standard_sync$m$4$m$2$s$1$m$2$m$1"]},
    {"name": "standard_sync$m$4$m$2$s$1$m$3", "symbols": ["_"]},
    {"name": "standard_sync$m$4$m$2$s$1$m$1$e$1", "symbols": []},
    {"name": "standard_sync$m$4$m$2$s$1$m$1$e$1$s$1", "symbols": ["standard_sync$m$4$m$2$s$1$m$3", "standard_sync$m$4$m$2$s$1$m$2"]},
    {"name": "standard_sync$m$4$m$2$s$1$m$1$e$1", "symbols": ["standard_sync$m$4$m$2$s$1$m$1$e$1", "standard_sync$m$4$m$2$s$1$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "standard_sync$m$4$m$2$s$1$m$1", "symbols": ["standard_sync$m$4$m$2$s$1$m$2", "standard_sync$m$4$m$2$s$1$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "standard_sync$m$4$m$2$s$1$e$1", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "standard_sync$m$4$m$2$s$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "standard_sync$m$4$m$2$s$1", "symbols": ["standard_sync$m$4$m$2$s$1$m$1", "_", "standard_sync$m$4$m$2$s$1$e$1"]},
    {"name": "standard_sync$m$4$m$2", "symbols": ["standard_sync$m$4$m$2$s$1"]},
    {"name": "standard_sync$m$4$m$1", "symbols": ["_", "standard_sync$m$4$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "standard_sync$m$4", "symbols": ["standard_sync$m$4$m$1"], "postprocess": ([[actions, , mirrored]]) => mirrored ? mirror(actions) : actions},
    {"name": "standard_sync", "symbols": ["standard_sync$m$4"], "postprocess": ([throws]) => finaliseSync(throws)},
    {"name": "standard_sync_toss$e$1", "symbols": ["cross"], "postprocess": id},
    {"name": "standard_sync_toss$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "standard_sync_toss", "symbols": ["integer_even", "standard_sync_toss$e$1"], "postprocess": ([value, cross]) => ({ value, cross: !!cross })},
    {"name": "compressed_async$m$2$m$2", "symbols": ["compressed_async_toss"]},
    {"name": "compressed_async$m$2$m$3", "symbols": []},
    {"name": "compressed_async$m$2$m$1", "symbols": ["compressed_async$m$2$m$2"], "postprocess": id},
    {"name": "compressed_async$m$2$m$1$e$1$s$1", "symbols": ["compressed_async$m$2$m$3", "compressed_async$m$2$m$2"]},
    {"name": "compressed_async$m$2$m$1$e$1", "symbols": ["compressed_async$m$2$m$1$e$1$s$1"]},
    {"name": "compressed_async$m$2$m$1$e$1$s$2", "symbols": ["compressed_async$m$2$m$3", "compressed_async$m$2$m$2"]},
    {"name": "compressed_async$m$2$m$1$e$1", "symbols": ["compressed_async$m$2$m$1$e$1", "compressed_async$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "compressed_async$m$2$m$1", "symbols": [{"literal":"["}, "compressed_async$m$2$m$2", "compressed_async$m$2$m$1$e$1", {"literal":"]"}], "postprocess": ([, [first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "compressed_async$m$2", "symbols": ["compressed_async$m$2$m$1"]},
    {"name": "compressed_async$m$3", "symbols": []},
    {"name": "compressed_async$m$1$m$2$m$2", "symbols": ["compressed_async$m$2"]},
    {"name": "compressed_async$m$1$m$2$m$3", "symbols": ["compressed_async$m$3"]},
    {"name": "compressed_async$m$1$m$2$m$1$e$1", "symbols": []},
    {"name": "compressed_async$m$1$m$2$m$1$e$1$s$1", "symbols": ["compressed_async$m$1$m$2$m$3", "compressed_async$m$1$m$2$m$2"]},
    {"name": "compressed_async$m$1$m$2$m$1$e$1", "symbols": ["compressed_async$m$1$m$2$m$1$e$1", "compressed_async$m$1$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "compressed_async$m$1$m$2$m$1", "symbols": ["compressed_async$m$1$m$2$m$2", "compressed_async$m$1$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "compressed_async$m$1$m$2", "symbols": ["compressed_async$m$1$m$2$m$1"]},
    {"name": "compressed_async$m$1$m$1", "symbols": ["_", "compressed_async$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "compressed_async$m$1", "symbols": ["compressed_async$m$1$m$1"], "postprocess": id},
    {"name": "compressed_async", "symbols": ["compressed_async$m$1"], "postprocess": ([throws]) => finaliseAsync(throws)},
    {"name": "compressed_async_toss", "symbols": ["digit"], "postprocess": ([value]) => ({ value })},
    {"name": "compressed_async_toss", "symbols": ["letter"], "postprocess": ([value]) => ({ value: numerify(value) })},
    {"name": "compressed_sync$m$2$m$2", "symbols": ["compressed_sync_toss"]},
    {"name": "compressed_sync$m$2$m$3", "symbols": []},
    {"name": "compressed_sync$m$2$m$1", "symbols": ["compressed_sync$m$2$m$2"], "postprocess": id},
    {"name": "compressed_sync$m$2$m$1$e$1$s$1", "symbols": ["compressed_sync$m$2$m$3", "compressed_sync$m$2$m$2"]},
    {"name": "compressed_sync$m$2$m$1$e$1", "symbols": ["compressed_sync$m$2$m$1$e$1$s$1"]},
    {"name": "compressed_sync$m$2$m$1$e$1$s$2", "symbols": ["compressed_sync$m$2$m$3", "compressed_sync$m$2$m$2"]},
    {"name": "compressed_sync$m$2$m$1$e$1", "symbols": ["compressed_sync$m$2$m$1$e$1", "compressed_sync$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "compressed_sync$m$2$m$1", "symbols": [{"literal":"["}, "compressed_sync$m$2$m$2", "compressed_sync$m$2$m$1$e$1", {"literal":"]"}], "postprocess": ([, [first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "compressed_sync$m$2", "symbols": ["compressed_sync$m$2$m$1"]},
    {"name": "compressed_sync$m$3", "symbols": [{"literal":","}]},
    {"name": "compressed_sync$m$1$m$2$s$1$e$1$m$2", "symbols": ["compressed_sync$m$2"]},
    {"name": "compressed_sync$m$1$m$2$s$1$e$1$m$3", "symbols": ["compressed_sync$m$3"]},
    {"name": "compressed_sync$m$1$m$2$s$1$e$1$m$1", "symbols": [{"literal":"("}, "compressed_sync$m$1$m$2$s$1$e$1$m$2", "compressed_sync$m$1$m$2$s$1$e$1$m$3", "compressed_sync$m$1$m$2$s$1$e$1$m$2", {"literal":")"}], "postprocess": ([, [[release1]], , [[release2]]]) => [release1, release2]},
    {"name": "compressed_sync$m$1$m$2$s$1$e$1", "symbols": ["compressed_sync$m$1$m$2$s$1$e$1$m$1"]},
    {"name": "compressed_sync$m$1$m$2$s$1$e$1$m$5", "symbols": ["compressed_sync$m$2"]},
    {"name": "compressed_sync$m$1$m$2$s$1$e$1$m$6", "symbols": ["compressed_sync$m$3"]},
    {"name": "compressed_sync$m$1$m$2$s$1$e$1$m$4", "symbols": [{"literal":"("}, "compressed_sync$m$1$m$2$s$1$e$1$m$5", "compressed_sync$m$1$m$2$s$1$e$1$m$6", "compressed_sync$m$1$m$2$s$1$e$1$m$5", {"literal":")"}], "postprocess": ([, [[release1]], , [[release2]]]) => [release1, release2]},
    {"name": "compressed_sync$m$1$m$2$s$1$e$1", "symbols": ["compressed_sync$m$1$m$2$s$1$e$1", "compressed_sync$m$1$m$2$s$1$e$1$m$4"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "compressed_sync$m$1$m$2$s$1$e$2", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "compressed_sync$m$1$m$2$s$1$e$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "compressed_sync$m$1$m$2$s$1", "symbols": ["compressed_sync$m$1$m$2$s$1$e$1", "compressed_sync$m$1$m$2$s$1$e$2"]},
    {"name": "compressed_sync$m$1$m$2", "symbols": ["compressed_sync$m$1$m$2$s$1"]},
    {"name": "compressed_sync$m$1$m$1", "symbols": ["_", "compressed_sync$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "compressed_sync$m$1", "symbols": ["compressed_sync$m$1$m$1"], "postprocess": ([[actions, mirrored]])   => mirrored ? mirror(actions) : actions},
    {"name": "compressed_sync", "symbols": ["compressed_sync$m$1"], "postprocess": ([throws]) => finaliseSync(throws)},
    {"name": "compressed_sync$m$5$m$2", "symbols": ["compressed_sync_toss"]},
    {"name": "compressed_sync$m$5$m$3", "symbols": []},
    {"name": "compressed_sync$m$5$m$1", "symbols": ["compressed_sync$m$5$m$2"], "postprocess": id},
    {"name": "compressed_sync$m$5$m$1$e$1$s$1", "symbols": ["compressed_sync$m$5$m$3", "compressed_sync$m$5$m$2"]},
    {"name": "compressed_sync$m$5$m$1$e$1", "symbols": ["compressed_sync$m$5$m$1$e$1$s$1"]},
    {"name": "compressed_sync$m$5$m$1$e$1$s$2", "symbols": ["compressed_sync$m$5$m$3", "compressed_sync$m$5$m$2"]},
    {"name": "compressed_sync$m$5$m$1$e$1", "symbols": ["compressed_sync$m$5$m$1$e$1", "compressed_sync$m$5$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "compressed_sync$m$5$m$1", "symbols": [{"literal":"["}, "compressed_sync$m$5$m$2", "compressed_sync$m$5$m$1$e$1", {"literal":"]"}], "postprocess": ([, [first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "compressed_sync$m$5", "symbols": ["compressed_sync$m$5$m$1"]},
    {"name": "compressed_sync$m$6", "symbols": []},
    {"name": "compressed_sync$m$4$m$2$s$1$e$1$m$2", "symbols": ["compressed_sync$m$5"]},
    {"name": "compressed_sync$m$4$m$2$s$1$e$1$m$3", "symbols": ["compressed_sync$m$6"]},
    {"name": "compressed_sync$m$4$m$2$s$1$e$1$m$1", "symbols": [{"literal":"("}, "compressed_sync$m$4$m$2$s$1$e$1$m$2", "compressed_sync$m$4$m$2$s$1$e$1$m$3", "compressed_sync$m$4$m$2$s$1$e$1$m$2", {"literal":")"}], "postprocess": ([, [[release1]], , [[release2]]]) => [release1, release2]},
    {"name": "compressed_sync$m$4$m$2$s$1$e$1", "symbols": ["compressed_sync$m$4$m$2$s$1$e$1$m$1"]},
    {"name": "compressed_sync$m$4$m$2$s$1$e$1$m$5", "symbols": ["compressed_sync$m$5"]},
    {"name": "compressed_sync$m$4$m$2$s$1$e$1$m$6", "symbols": ["compressed_sync$m$6"]},
    {"name": "compressed_sync$m$4$m$2$s$1$e$1$m$4", "symbols": [{"literal":"("}, "compressed_sync$m$4$m$2$s$1$e$1$m$5", "compressed_sync$m$4$m$2$s$1$e$1$m$6", "compressed_sync$m$4$m$2$s$1$e$1$m$5", {"literal":")"}], "postprocess": ([, [[release1]], , [[release2]]]) => [release1, release2]},
    {"name": "compressed_sync$m$4$m$2$s$1$e$1", "symbols": ["compressed_sync$m$4$m$2$s$1$e$1", "compressed_sync$m$4$m$2$s$1$e$1$m$4"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "compressed_sync$m$4$m$2$s$1$e$2", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "compressed_sync$m$4$m$2$s$1$e$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "compressed_sync$m$4$m$2$s$1", "symbols": ["compressed_sync$m$4$m$2$s$1$e$1", "compressed_sync$m$4$m$2$s$1$e$2"]},
    {"name": "compressed_sync$m$4$m$2", "symbols": ["compressed_sync$m$4$m$2$s$1"]},
    {"name": "compressed_sync$m$4$m$1", "symbols": ["_", "compressed_sync$m$4$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "compressed_sync$m$4", "symbols": ["compressed_sync$m$4$m$1"], "postprocess": ([[actions, mirrored]])   => mirrored ? mirror(actions) : actions},
    {"name": "compressed_sync", "symbols": ["compressed_sync$m$4"], "postprocess": ([throws]) => finaliseSync(throws)},
    {"name": "compressed_sync_toss$e$1", "symbols": ["cross"], "postprocess": id},
    {"name": "compressed_sync_toss$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "compressed_sync_toss", "symbols": ["digit_even", "compressed_sync_toss$e$1"], "postprocess": ([value, cross]) => ({ value,                  cross: !!cross })},
    {"name": "compressed_sync_toss$e$2", "symbols": ["cross"], "postprocess": id},
    {"name": "compressed_sync_toss$e$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "compressed_sync_toss", "symbols": ["letter_even", "compressed_sync_toss$e$2"], "postprocess": ([value, cross]) => ({ value: numerify(value), cross: !!cross })},
    {"name": "passing_async$m$2$m$2$m$2$m$2", "symbols": ["pass"]},
    {"name": "passing_async$m$2$m$2$m$2$m$1$e$1", "symbols": ["passing_async$m$2$m$2$m$2$m$2"], "postprocess": id},
    {"name": "passing_async$m$2$m$2$m$2$m$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "passing_async$m$2$m$2$m$2$m$1", "symbols": ["integer", "passing_async$m$2$m$2$m$2$m$1$e$1"], "postprocess": ([value, pass]) => ({ value, pass: pass ? pass[0] : false })},
    {"name": "passing_async$m$2$m$2$m$2", "symbols": ["passing_async$m$2$m$2$m$2$m$1"]},
    {"name": "passing_async$m$2$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "passing_async$m$2$m$2$m$1", "symbols": ["passing_async$m$2$m$2$m$2"], "postprocess": id},
    {"name": "passing_async$m$2$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_async$m$2$m$2$m$3", "_", "passing_async$m$2$m$2$m$2"]},
    {"name": "passing_async$m$2$m$2$m$1$e$1", "symbols": ["passing_async$m$2$m$2$m$1$e$1$s$1"]},
    {"name": "passing_async$m$2$m$2$m$1$e$1$s$2", "symbols": ["_", "passing_async$m$2$m$2$m$3", "_", "passing_async$m$2$m$2$m$2"]},
    {"name": "passing_async$m$2$m$2$m$1$e$1", "symbols": ["passing_async$m$2$m$2$m$1$e$1", "passing_async$m$2$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$2$m$2$m$1", "symbols": [{"literal":"["}, "_", "passing_async$m$2$m$2$m$2", "passing_async$m$2$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_async$m$2$m$2", "symbols": ["passing_async$m$2$m$2$m$1"]},
    {"name": "passing_async$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "passing_async$m$2$m$1$m$2$m$2", "symbols": ["passing_async$m$2$m$2"]},
    {"name": "passing_async$m$2$m$1$m$2$m$3", "symbols": ["passing_async$m$2$m$3"]},
    {"name": "passing_async$m$2$m$1$m$2$m$1$e$1", "symbols": []},
    {"name": "passing_async$m$2$m$1$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_async$m$2$m$1$m$2$m$3", "_", "passing_async$m$2$m$1$m$2$m$2"]},
    {"name": "passing_async$m$2$m$1$m$2$m$1$e$1", "symbols": ["passing_async$m$2$m$1$m$2$m$1$e$1", "passing_async$m$2$m$1$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$2$m$1$m$2$m$1", "symbols": ["passing_async$m$2$m$1$m$2$m$2", "passing_async$m$2$m$1$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_async$m$2$m$1$m$2", "symbols": ["passing_async$m$2$m$1$m$2$m$1"]},
    {"name": "passing_async$m$2$m$1$m$1", "symbols": ["_", "passing_async$m$2$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_async$m$2$m$1", "symbols": ["passing_async$m$2$m$1$m$1"], "postprocess": id},
    {"name": "passing_async$m$2", "symbols": ["passing_async$m$2$m$1"]},
    {"name": "passing_async$m$1$m$2$s$1$e$1$s$1", "symbols": [{"literal":"|"}, "passing_async$m$2"]},
    {"name": "passing_async$m$1$m$2$s$1$e$1", "symbols": ["passing_async$m$1$m$2$s$1$e$1$s$1"]},
    {"name": "passing_async$m$1$m$2$s$1$e$1$s$2", "symbols": [{"literal":"|"}, "passing_async$m$2"]},
    {"name": "passing_async$m$1$m$2$s$1$e$1", "symbols": ["passing_async$m$1$m$2$s$1$e$1", "passing_async$m$1$m$2$s$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$1$m$2$s$1", "symbols": [{"literal":"<"}, "passing_async$m$2", "passing_async$m$1$m$2$s$1$e$1", {"literal":">"}]},
    {"name": "passing_async$m$1$m$2", "symbols": ["passing_async$m$1$m$2$s$1"]},
    {"name": "passing_async$m$1$m$1", "symbols": ["_", "passing_async$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_async$m$1", "symbols": ["passing_async$m$1$m$1"], "postprocess": ([[, [first], rest]]) => [first, ...rest.map(([,[match]]) => match)]},
    {"name": "passing_async", "symbols": ["passing_async$m$1"], "postprocess": ([siteswaps]) => finalisePassingAsync(siteswaps)},
    {"name": "passing_async$m$4$m$2$m$2$m$2", "symbols": ["pass"]},
    {"name": "passing_async$m$4$m$2$m$2$m$1$e$1", "symbols": ["passing_async$m$4$m$2$m$2$m$2"], "postprocess": id},
    {"name": "passing_async$m$4$m$2$m$2$m$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "passing_async$m$4$m$2$m$2$m$1", "symbols": ["integer", "passing_async$m$4$m$2$m$2$m$1$e$1"], "postprocess": ([value, pass]) => ({ value, pass: pass ? pass[0] : false })},
    {"name": "passing_async$m$4$m$2$m$2", "symbols": ["passing_async$m$4$m$2$m$2$m$1"]},
    {"name": "passing_async$m$4$m$2$m$3", "symbols": [{"literal":" "}]},
    {"name": "passing_async$m$4$m$2$m$1", "symbols": ["passing_async$m$4$m$2$m$2"], "postprocess": id},
    {"name": "passing_async$m$4$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_async$m$4$m$2$m$3", "_", "passing_async$m$4$m$2$m$2"]},
    {"name": "passing_async$m$4$m$2$m$1$e$1", "symbols": ["passing_async$m$4$m$2$m$1$e$1$s$1"]},
    {"name": "passing_async$m$4$m$2$m$1$e$1$s$2", "symbols": ["_", "passing_async$m$4$m$2$m$3", "_", "passing_async$m$4$m$2$m$2"]},
    {"name": "passing_async$m$4$m$2$m$1$e$1", "symbols": ["passing_async$m$4$m$2$m$1$e$1", "passing_async$m$4$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$4$m$2$m$1", "symbols": [{"literal":"["}, "_", "passing_async$m$4$m$2$m$2", "passing_async$m$4$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_async$m$4$m$2", "symbols": ["passing_async$m$4$m$2$m$1"]},
    {"name": "passing_async$m$4$m$3", "symbols": [{"literal":" "}]},
    {"name": "passing_async$m$4$m$1$m$2$m$2", "symbols": ["passing_async$m$4$m$2"]},
    {"name": "passing_async$m$4$m$1$m$2$m$3", "symbols": ["passing_async$m$4$m$3"]},
    {"name": "passing_async$m$4$m$1$m$2$m$1$e$1", "symbols": []},
    {"name": "passing_async$m$4$m$1$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_async$m$4$m$1$m$2$m$3", "_", "passing_async$m$4$m$1$m$2$m$2"]},
    {"name": "passing_async$m$4$m$1$m$2$m$1$e$1", "symbols": ["passing_async$m$4$m$1$m$2$m$1$e$1", "passing_async$m$4$m$1$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$4$m$1$m$2$m$1", "symbols": ["passing_async$m$4$m$1$m$2$m$2", "passing_async$m$4$m$1$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_async$m$4$m$1$m$2", "symbols": ["passing_async$m$4$m$1$m$2$m$1"]},
    {"name": "passing_async$m$4$m$1$m$1", "symbols": ["_", "passing_async$m$4$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_async$m$4$m$1", "symbols": ["passing_async$m$4$m$1$m$1"], "postprocess": id},
    {"name": "passing_async$m$4", "symbols": ["passing_async$m$4$m$1"]},
    {"name": "passing_async$m$3$m$2$s$1$e$1$s$1", "symbols": [{"literal":"|"}, "passing_async$m$4"]},
    {"name": "passing_async$m$3$m$2$s$1$e$1", "symbols": ["passing_async$m$3$m$2$s$1$e$1$s$1"]},
    {"name": "passing_async$m$3$m$2$s$1$e$1$s$2", "symbols": [{"literal":"|"}, "passing_async$m$4"]},
    {"name": "passing_async$m$3$m$2$s$1$e$1", "symbols": ["passing_async$m$3$m$2$s$1$e$1", "passing_async$m$3$m$2$s$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$3$m$2$s$1", "symbols": [{"literal":"<"}, "passing_async$m$4", "passing_async$m$3$m$2$s$1$e$1", {"literal":">"}]},
    {"name": "passing_async$m$3$m$2", "symbols": ["passing_async$m$3$m$2$s$1"]},
    {"name": "passing_async$m$3$m$1", "symbols": ["_", "passing_async$m$3$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_async$m$3", "symbols": ["passing_async$m$3$m$1"], "postprocess": ([[, [first], rest]]) => [first, ...rest.map(([,[match]]) => match)]},
    {"name": "passing_async", "symbols": ["passing_async$m$3"], "postprocess": ([siteswaps]) => finalisePassingAsync(siteswaps)},
    {"name": "passing_async$m$6$m$2$m$2$m$2", "symbols": ["crosspass"]},
    {"name": "passing_async$m$6$m$2$m$2$m$1$e$1", "symbols": ["passing_async$m$6$m$2$m$2$m$2"], "postprocess": id},
    {"name": "passing_async$m$6$m$2$m$2$m$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "passing_async$m$6$m$2$m$2$m$1", "symbols": ["integer", "passing_async$m$6$m$2$m$2$m$1$e$1"], "postprocess": ([value, pass]) => ({ value, pass: pass ? pass[0] : false })},
    {"name": "passing_async$m$6$m$2$m$2", "symbols": ["passing_async$m$6$m$2$m$2$m$1"]},
    {"name": "passing_async$m$6$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "passing_async$m$6$m$2$m$1", "symbols": ["passing_async$m$6$m$2$m$2"], "postprocess": id},
    {"name": "passing_async$m$6$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_async$m$6$m$2$m$3", "_", "passing_async$m$6$m$2$m$2"]},
    {"name": "passing_async$m$6$m$2$m$1$e$1", "symbols": ["passing_async$m$6$m$2$m$1$e$1$s$1"]},
    {"name": "passing_async$m$6$m$2$m$1$e$1$s$2", "symbols": ["_", "passing_async$m$6$m$2$m$3", "_", "passing_async$m$6$m$2$m$2"]},
    {"name": "passing_async$m$6$m$2$m$1$e$1", "symbols": ["passing_async$m$6$m$2$m$1$e$1", "passing_async$m$6$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$6$m$2$m$1", "symbols": [{"literal":"["}, "_", "passing_async$m$6$m$2$m$2", "passing_async$m$6$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_async$m$6$m$2", "symbols": ["passing_async$m$6$m$2$m$1"]},
    {"name": "passing_async$m$6$m$3", "symbols": [{"literal":","}]},
    {"name": "passing_async$m$6$m$1$m$2$m$2", "symbols": ["passing_async$m$6$m$2"]},
    {"name": "passing_async$m$6$m$1$m$2$m$3", "symbols": ["passing_async$m$6$m$3"]},
    {"name": "passing_async$m$6$m$1$m$2$m$1$e$1", "symbols": []},
    {"name": "passing_async$m$6$m$1$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_async$m$6$m$1$m$2$m$3", "_", "passing_async$m$6$m$1$m$2$m$2"]},
    {"name": "passing_async$m$6$m$1$m$2$m$1$e$1", "symbols": ["passing_async$m$6$m$1$m$2$m$1$e$1", "passing_async$m$6$m$1$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$6$m$1$m$2$m$1", "symbols": ["passing_async$m$6$m$1$m$2$m$2", "passing_async$m$6$m$1$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_async$m$6$m$1$m$2", "symbols": ["passing_async$m$6$m$1$m$2$m$1"]},
    {"name": "passing_async$m$6$m$1$m$1", "symbols": ["_", "passing_async$m$6$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_async$m$6$m$1", "symbols": ["passing_async$m$6$m$1$m$1"], "postprocess": id},
    {"name": "passing_async$m$6", "symbols": ["passing_async$m$6$m$1"]},
    {"name": "passing_async$m$5$m$2$s$1", "symbols": [{"literal":"<"}, "passing_async$m$6", {"literal":"|"}, "passing_async$m$6", {"literal":">"}]},
    {"name": "passing_async$m$5$m$2", "symbols": ["passing_async$m$5$m$2$s$1"]},
    {"name": "passing_async$m$5$m$1", "symbols": ["_", "passing_async$m$5$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_async$m$5", "symbols": ["passing_async$m$5$m$1"], "postprocess": ([[, [first], , [second]]]) => [first, second]},
    {"name": "passing_async", "symbols": ["passing_async$m$5"], "postprocess": ([siteswaps]) => finalisePassingAsync(siteswaps)},
    {"name": "passing_async$m$8$m$2$m$2$m$2", "symbols": ["crosspass"]},
    {"name": "passing_async$m$8$m$2$m$2$m$1$e$1", "symbols": ["passing_async$m$8$m$2$m$2$m$2"], "postprocess": id},
    {"name": "passing_async$m$8$m$2$m$2$m$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "passing_async$m$8$m$2$m$2$m$1", "symbols": ["integer", "passing_async$m$8$m$2$m$2$m$1$e$1"], "postprocess": ([value, pass]) => ({ value, pass: pass ? pass[0] : false })},
    {"name": "passing_async$m$8$m$2$m$2", "symbols": ["passing_async$m$8$m$2$m$2$m$1"]},
    {"name": "passing_async$m$8$m$2$m$3", "symbols": [{"literal":" "}]},
    {"name": "passing_async$m$8$m$2$m$1", "symbols": ["passing_async$m$8$m$2$m$2"], "postprocess": id},
    {"name": "passing_async$m$8$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_async$m$8$m$2$m$3", "_", "passing_async$m$8$m$2$m$2"]},
    {"name": "passing_async$m$8$m$2$m$1$e$1", "symbols": ["passing_async$m$8$m$2$m$1$e$1$s$1"]},
    {"name": "passing_async$m$8$m$2$m$1$e$1$s$2", "symbols": ["_", "passing_async$m$8$m$2$m$3", "_", "passing_async$m$8$m$2$m$2"]},
    {"name": "passing_async$m$8$m$2$m$1$e$1", "symbols": ["passing_async$m$8$m$2$m$1$e$1", "passing_async$m$8$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$8$m$2$m$1", "symbols": [{"literal":"["}, "_", "passing_async$m$8$m$2$m$2", "passing_async$m$8$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_async$m$8$m$2", "symbols": ["passing_async$m$8$m$2$m$1"]},
    {"name": "passing_async$m$8$m$3", "symbols": [{"literal":" "}]},
    {"name": "passing_async$m$8$m$1$m$2$m$2", "symbols": ["passing_async$m$8$m$2"]},
    {"name": "passing_async$m$8$m$1$m$2$m$3", "symbols": ["passing_async$m$8$m$3"]},
    {"name": "passing_async$m$8$m$1$m$2$m$1$e$1", "symbols": []},
    {"name": "passing_async$m$8$m$1$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_async$m$8$m$1$m$2$m$3", "_", "passing_async$m$8$m$1$m$2$m$2"]},
    {"name": "passing_async$m$8$m$1$m$2$m$1$e$1", "symbols": ["passing_async$m$8$m$1$m$2$m$1$e$1", "passing_async$m$8$m$1$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_async$m$8$m$1$m$2$m$1", "symbols": ["passing_async$m$8$m$1$m$2$m$2", "passing_async$m$8$m$1$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_async$m$8$m$1$m$2", "symbols": ["passing_async$m$8$m$1$m$2$m$1"]},
    {"name": "passing_async$m$8$m$1$m$1", "symbols": ["_", "passing_async$m$8$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_async$m$8$m$1", "symbols": ["passing_async$m$8$m$1$m$1"], "postprocess": id},
    {"name": "passing_async$m$8", "symbols": ["passing_async$m$8$m$1"]},
    {"name": "passing_async$m$7$m$2$s$1", "symbols": [{"literal":"<"}, "passing_async$m$8", {"literal":"|"}, "passing_async$m$8", {"literal":">"}]},
    {"name": "passing_async$m$7$m$2", "symbols": ["passing_async$m$7$m$2$s$1"]},
    {"name": "passing_async$m$7$m$1", "symbols": ["_", "passing_async$m$7$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_async$m$7", "symbols": ["passing_async$m$7$m$1"], "postprocess": ([[, [first], , [second]]]) => [first, second]},
    {"name": "passing_async", "symbols": ["passing_async$m$7"], "postprocess": ([siteswaps]) => finalisePassingAsync(siteswaps)},
    {"name": "passing_sync$m$2$m$2$m$2$m$2", "symbols": ["pass"]},
    {"name": "passing_sync$m$2$m$2$m$2$m$1$m$2", "symbols": ["passing_sync$m$2$m$2$m$2$m$2"]},
    {"name": "passing_sync$m$2$m$2$m$2$m$1$m$3", "symbols": ["cross"]},
    {"name": "passing_sync$m$2$m$2$m$2$m$1$m$1", "symbols": [], "postprocess": ()             => [false, false]},
    {"name": "passing_sync$m$2$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$2$m$2$m$2$m$1$m$2"], "postprocess": ([[match]])    => [match, false]},
    {"name": "passing_sync$m$2$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$2$m$2$m$2$m$1$m$3"], "postprocess": ([[match]])    => [false, match]},
    {"name": "passing_sync$m$2$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$2$m$2$m$2$m$1$m$2", "passing_sync$m$2$m$2$m$2$m$1$m$3"], "postprocess": ([[m1], [m2]]) => [m1, m2]},
    {"name": "passing_sync$m$2$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$2$m$2$m$2$m$1$m$3", "passing_sync$m$2$m$2$m$2$m$1$m$2"], "postprocess": ([[m1], [m2]]) => [m2, m1]},
    {"name": "passing_sync$m$2$m$2$m$2$m$1", "symbols": ["integer_even", "passing_sync$m$2$m$2$m$2$m$1$m$1"], "postprocess": ([value, [pass, cross]]) => ({ value, pass: pass ? pass[0] : false, cross })},
    {"name": "passing_sync$m$2$m$2$m$2", "symbols": ["passing_sync$m$2$m$2$m$2$m$1"]},
    {"name": "passing_sync$m$2$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "passing_sync$m$2$m$2$m$1", "symbols": ["passing_sync$m$2$m$2$m$2"], "postprocess": id},
    {"name": "passing_sync$m$2$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_sync$m$2$m$2$m$3", "_", "passing_sync$m$2$m$2$m$2"]},
    {"name": "passing_sync$m$2$m$2$m$1$e$1", "symbols": ["passing_sync$m$2$m$2$m$1$e$1$s$1"]},
    {"name": "passing_sync$m$2$m$2$m$1$e$1$s$2", "symbols": ["_", "passing_sync$m$2$m$2$m$3", "_", "passing_sync$m$2$m$2$m$2"]},
    {"name": "passing_sync$m$2$m$2$m$1$e$1", "symbols": ["passing_sync$m$2$m$2$m$1$e$1", "passing_sync$m$2$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$2$m$2$m$1", "symbols": [{"literal":"["}, "_", "passing_sync$m$2$m$2$m$2", "passing_sync$m$2$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_sync$m$2$m$2", "symbols": ["passing_sync$m$2$m$2$m$1"]},
    {"name": "passing_sync$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$2$m$2", "symbols": ["passing_sync$m$2$m$2"]},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$2$m$3", "symbols": ["passing_sync$m$2$m$3"]},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$2$m$1", "symbols": [{"literal":"("}, "_", "passing_sync$m$2$m$1$m$2$s$1$m$2$m$2", "_", "passing_sync$m$2$m$1$m$2$s$1$m$2$m$3", "_", "passing_sync$m$2$m$1$m$2$s$1$m$2$m$2", "_", {"literal":")"}], "postprocess": ([, , [[release1]], , , , [[release2]]]) => [release1, release2]},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$2", "symbols": ["passing_sync$m$2$m$1$m$2$s$1$m$2$m$1"]},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$3", "symbols": ["_"]},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$1$e$1", "symbols": []},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$1$e$1$s$1", "symbols": ["passing_sync$m$2$m$1$m$2$s$1$m$3", "passing_sync$m$2$m$1$m$2$s$1$m$2"]},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$1$e$1", "symbols": ["passing_sync$m$2$m$1$m$2$s$1$m$1$e$1", "passing_sync$m$2$m$1$m$2$s$1$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$m$1", "symbols": ["passing_sync$m$2$m$1$m$2$s$1$m$2", "passing_sync$m$2$m$1$m$2$s$1$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$e$1", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "passing_sync$m$2$m$1$m$2$s$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "passing_sync$m$2$m$1$m$2$s$1", "symbols": ["passing_sync$m$2$m$1$m$2$s$1$m$1", "_", "passing_sync$m$2$m$1$m$2$s$1$e$1"]},
    {"name": "passing_sync$m$2$m$1$m$2", "symbols": ["passing_sync$m$2$m$1$m$2$s$1"]},
    {"name": "passing_sync$m$2$m$1$m$1", "symbols": ["_", "passing_sync$m$2$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_sync$m$2$m$1", "symbols": ["passing_sync$m$2$m$1$m$1"], "postprocess": ([[actions, , mirrored]]) => mirrored ? mirror(actions) : actions},
    {"name": "passing_sync$m$2", "symbols": ["passing_sync$m$2$m$1"]},
    {"name": "passing_sync$m$1$m$2$s$1$e$1$s$1", "symbols": [{"literal":"|"}, "passing_sync$m$2"]},
    {"name": "passing_sync$m$1$m$2$s$1$e$1", "symbols": ["passing_sync$m$1$m$2$s$1$e$1$s$1"]},
    {"name": "passing_sync$m$1$m$2$s$1$e$1$s$2", "symbols": [{"literal":"|"}, "passing_sync$m$2"]},
    {"name": "passing_sync$m$1$m$2$s$1$e$1", "symbols": ["passing_sync$m$1$m$2$s$1$e$1", "passing_sync$m$1$m$2$s$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$1$m$2$s$1", "symbols": [{"literal":"<"}, "passing_sync$m$2", "passing_sync$m$1$m$2$s$1$e$1", {"literal":">"}]},
    {"name": "passing_sync$m$1$m$2", "symbols": ["passing_sync$m$1$m$2$s$1"]},
    {"name": "passing_sync$m$1$m$1", "symbols": ["_", "passing_sync$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_sync$m$1", "symbols": ["passing_sync$m$1$m$1"], "postprocess": ([[, [first], rest]]) => [first, ...rest.map(([,[match]]) => match)]},
    {"name": "passing_sync", "symbols": ["passing_sync$m$1"], "postprocess": ([siteswaps]) => finalisePassingSync(siteswaps)},
    {"name": "passing_sync$m$4$m$2$m$2$m$2", "symbols": ["pass"]},
    {"name": "passing_sync$m$4$m$2$m$2$m$1$m$2", "symbols": ["passing_sync$m$4$m$2$m$2$m$2"]},
    {"name": "passing_sync$m$4$m$2$m$2$m$1$m$3", "symbols": ["cross"]},
    {"name": "passing_sync$m$4$m$2$m$2$m$1$m$1", "symbols": [], "postprocess": ()             => [false, false]},
    {"name": "passing_sync$m$4$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$4$m$2$m$2$m$1$m$2"], "postprocess": ([[match]])    => [match, false]},
    {"name": "passing_sync$m$4$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$4$m$2$m$2$m$1$m$3"], "postprocess": ([[match]])    => [false, match]},
    {"name": "passing_sync$m$4$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$4$m$2$m$2$m$1$m$2", "passing_sync$m$4$m$2$m$2$m$1$m$3"], "postprocess": ([[m1], [m2]]) => [m1, m2]},
    {"name": "passing_sync$m$4$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$4$m$2$m$2$m$1$m$3", "passing_sync$m$4$m$2$m$2$m$1$m$2"], "postprocess": ([[m1], [m2]]) => [m2, m1]},
    {"name": "passing_sync$m$4$m$2$m$2$m$1", "symbols": ["integer_even", "passing_sync$m$4$m$2$m$2$m$1$m$1"], "postprocess": ([value, [pass, cross]]) => ({ value, pass: pass ? pass[0] : false, cross })},
    {"name": "passing_sync$m$4$m$2$m$2", "symbols": ["passing_sync$m$4$m$2$m$2$m$1"]},
    {"name": "passing_sync$m$4$m$2$m$3", "symbols": [{"literal":" "}]},
    {"name": "passing_sync$m$4$m$2$m$1", "symbols": ["passing_sync$m$4$m$2$m$2"], "postprocess": id},
    {"name": "passing_sync$m$4$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_sync$m$4$m$2$m$3", "_", "passing_sync$m$4$m$2$m$2"]},
    {"name": "passing_sync$m$4$m$2$m$1$e$1", "symbols": ["passing_sync$m$4$m$2$m$1$e$1$s$1"]},
    {"name": "passing_sync$m$4$m$2$m$1$e$1$s$2", "symbols": ["_", "passing_sync$m$4$m$2$m$3", "_", "passing_sync$m$4$m$2$m$2"]},
    {"name": "passing_sync$m$4$m$2$m$1$e$1", "symbols": ["passing_sync$m$4$m$2$m$1$e$1", "passing_sync$m$4$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$4$m$2$m$1", "symbols": [{"literal":"["}, "_", "passing_sync$m$4$m$2$m$2", "passing_sync$m$4$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_sync$m$4$m$2", "symbols": ["passing_sync$m$4$m$2$m$1"]},
    {"name": "passing_sync$m$4$m$3", "symbols": [{"literal":" "}]},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$2$m$2", "symbols": ["passing_sync$m$4$m$2"]},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$2$m$3", "symbols": ["passing_sync$m$4$m$3"]},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$2$m$1", "symbols": [{"literal":"("}, "_", "passing_sync$m$4$m$1$m$2$s$1$m$2$m$2", "_", "passing_sync$m$4$m$1$m$2$s$1$m$2$m$3", "_", "passing_sync$m$4$m$1$m$2$s$1$m$2$m$2", "_", {"literal":")"}], "postprocess": ([, , [[release1]], , , , [[release2]]]) => [release1, release2]},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$2", "symbols": ["passing_sync$m$4$m$1$m$2$s$1$m$2$m$1"]},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$3", "symbols": ["_"]},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$1$e$1", "symbols": []},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$1$e$1$s$1", "symbols": ["passing_sync$m$4$m$1$m$2$s$1$m$3", "passing_sync$m$4$m$1$m$2$s$1$m$2"]},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$1$e$1", "symbols": ["passing_sync$m$4$m$1$m$2$s$1$m$1$e$1", "passing_sync$m$4$m$1$m$2$s$1$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$m$1", "symbols": ["passing_sync$m$4$m$1$m$2$s$1$m$2", "passing_sync$m$4$m$1$m$2$s$1$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$e$1", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "passing_sync$m$4$m$1$m$2$s$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "passing_sync$m$4$m$1$m$2$s$1", "symbols": ["passing_sync$m$4$m$1$m$2$s$1$m$1", "_", "passing_sync$m$4$m$1$m$2$s$1$e$1"]},
    {"name": "passing_sync$m$4$m$1$m$2", "symbols": ["passing_sync$m$4$m$1$m$2$s$1"]},
    {"name": "passing_sync$m$4$m$1$m$1", "symbols": ["_", "passing_sync$m$4$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_sync$m$4$m$1", "symbols": ["passing_sync$m$4$m$1$m$1"], "postprocess": ([[actions, , mirrored]]) => mirrored ? mirror(actions) : actions},
    {"name": "passing_sync$m$4", "symbols": ["passing_sync$m$4$m$1"]},
    {"name": "passing_sync$m$3$m$2$s$1$e$1$s$1", "symbols": [{"literal":"|"}, "passing_sync$m$4"]},
    {"name": "passing_sync$m$3$m$2$s$1$e$1", "symbols": ["passing_sync$m$3$m$2$s$1$e$1$s$1"]},
    {"name": "passing_sync$m$3$m$2$s$1$e$1$s$2", "symbols": [{"literal":"|"}, "passing_sync$m$4"]},
    {"name": "passing_sync$m$3$m$2$s$1$e$1", "symbols": ["passing_sync$m$3$m$2$s$1$e$1", "passing_sync$m$3$m$2$s$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$3$m$2$s$1", "symbols": [{"literal":"<"}, "passing_sync$m$4", "passing_sync$m$3$m$2$s$1$e$1", {"literal":">"}]},
    {"name": "passing_sync$m$3$m$2", "symbols": ["passing_sync$m$3$m$2$s$1"]},
    {"name": "passing_sync$m$3$m$1", "symbols": ["_", "passing_sync$m$3$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_sync$m$3", "symbols": ["passing_sync$m$3$m$1"], "postprocess": ([[, [first], rest]]) => [first, ...rest.map(([,[match]]) => match)]},
    {"name": "passing_sync", "symbols": ["passing_sync$m$3"], "postprocess": ([siteswaps]) => finalisePassingSync(siteswaps)},
    {"name": "passing_sync$m$6$m$2$m$2$m$2", "symbols": ["crosspass"]},
    {"name": "passing_sync$m$6$m$2$m$2$m$1$m$2", "symbols": ["passing_sync$m$6$m$2$m$2$m$2"]},
    {"name": "passing_sync$m$6$m$2$m$2$m$1$m$3", "symbols": ["cross"]},
    {"name": "passing_sync$m$6$m$2$m$2$m$1$m$1", "symbols": [], "postprocess": ()             => [false, false]},
    {"name": "passing_sync$m$6$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$6$m$2$m$2$m$1$m$2"], "postprocess": ([[match]])    => [match, false]},
    {"name": "passing_sync$m$6$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$6$m$2$m$2$m$1$m$3"], "postprocess": ([[match]])    => [false, match]},
    {"name": "passing_sync$m$6$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$6$m$2$m$2$m$1$m$2", "passing_sync$m$6$m$2$m$2$m$1$m$3"], "postprocess": ([[m1], [m2]]) => [m1, m2]},
    {"name": "passing_sync$m$6$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$6$m$2$m$2$m$1$m$3", "passing_sync$m$6$m$2$m$2$m$1$m$2"], "postprocess": ([[m1], [m2]]) => [m2, m1]},
    {"name": "passing_sync$m$6$m$2$m$2$m$1", "symbols": ["integer_even", "passing_sync$m$6$m$2$m$2$m$1$m$1"], "postprocess": ([value, [pass, cross]]) => ({ value, pass: pass ? pass[0] : false, cross })},
    {"name": "passing_sync$m$6$m$2$m$2", "symbols": ["passing_sync$m$6$m$2$m$2$m$1"]},
    {"name": "passing_sync$m$6$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "passing_sync$m$6$m$2$m$1", "symbols": ["passing_sync$m$6$m$2$m$2"], "postprocess": id},
    {"name": "passing_sync$m$6$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_sync$m$6$m$2$m$3", "_", "passing_sync$m$6$m$2$m$2"]},
    {"name": "passing_sync$m$6$m$2$m$1$e$1", "symbols": ["passing_sync$m$6$m$2$m$1$e$1$s$1"]},
    {"name": "passing_sync$m$6$m$2$m$1$e$1$s$2", "symbols": ["_", "passing_sync$m$6$m$2$m$3", "_", "passing_sync$m$6$m$2$m$2"]},
    {"name": "passing_sync$m$6$m$2$m$1$e$1", "symbols": ["passing_sync$m$6$m$2$m$1$e$1", "passing_sync$m$6$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$6$m$2$m$1", "symbols": [{"literal":"["}, "_", "passing_sync$m$6$m$2$m$2", "passing_sync$m$6$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_sync$m$6$m$2", "symbols": ["passing_sync$m$6$m$2$m$1"]},
    {"name": "passing_sync$m$6$m$3", "symbols": [{"literal":","}]},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$2$m$2", "symbols": ["passing_sync$m$6$m$2"]},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$2$m$3", "symbols": ["passing_sync$m$6$m$3"]},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$2$m$1", "symbols": [{"literal":"("}, "_", "passing_sync$m$6$m$1$m$2$s$1$m$2$m$2", "_", "passing_sync$m$6$m$1$m$2$s$1$m$2$m$3", "_", "passing_sync$m$6$m$1$m$2$s$1$m$2$m$2", "_", {"literal":")"}], "postprocess": ([, , [[release1]], , , , [[release2]]]) => [release1, release2]},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$2", "symbols": ["passing_sync$m$6$m$1$m$2$s$1$m$2$m$1"]},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$3", "symbols": ["_"]},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$1$e$1", "symbols": []},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$1$e$1$s$1", "symbols": ["passing_sync$m$6$m$1$m$2$s$1$m$3", "passing_sync$m$6$m$1$m$2$s$1$m$2"]},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$1$e$1", "symbols": ["passing_sync$m$6$m$1$m$2$s$1$m$1$e$1", "passing_sync$m$6$m$1$m$2$s$1$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$m$1", "symbols": ["passing_sync$m$6$m$1$m$2$s$1$m$2", "passing_sync$m$6$m$1$m$2$s$1$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$e$1", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "passing_sync$m$6$m$1$m$2$s$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "passing_sync$m$6$m$1$m$2$s$1", "symbols": ["passing_sync$m$6$m$1$m$2$s$1$m$1", "_", "passing_sync$m$6$m$1$m$2$s$1$e$1"]},
    {"name": "passing_sync$m$6$m$1$m$2", "symbols": ["passing_sync$m$6$m$1$m$2$s$1"]},
    {"name": "passing_sync$m$6$m$1$m$1", "symbols": ["_", "passing_sync$m$6$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_sync$m$6$m$1", "symbols": ["passing_sync$m$6$m$1$m$1"], "postprocess": ([[actions, , mirrored]]) => mirrored ? mirror(actions) : actions},
    {"name": "passing_sync$m$6", "symbols": ["passing_sync$m$6$m$1"]},
    {"name": "passing_sync$m$5$m$2$s$1", "symbols": [{"literal":"<"}, "passing_sync$m$6", {"literal":"|"}, "passing_sync$m$6", {"literal":">"}]},
    {"name": "passing_sync$m$5$m$2", "symbols": ["passing_sync$m$5$m$2$s$1"]},
    {"name": "passing_sync$m$5$m$1", "symbols": ["_", "passing_sync$m$5$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_sync$m$5", "symbols": ["passing_sync$m$5$m$1"], "postprocess": ([[, [first], , [second]]]) => [first, second]},
    {"name": "passing_sync", "symbols": ["passing_sync$m$5"], "postprocess": ([siteswaps]) => finalisePassingSync(siteswaps)},
    {"name": "passing_sync$m$8$m$2$m$2$m$2", "symbols": ["crosspass"]},
    {"name": "passing_sync$m$8$m$2$m$2$m$1$m$2", "symbols": ["passing_sync$m$8$m$2$m$2$m$2"]},
    {"name": "passing_sync$m$8$m$2$m$2$m$1$m$3", "symbols": ["cross"]},
    {"name": "passing_sync$m$8$m$2$m$2$m$1$m$1", "symbols": [], "postprocess": ()             => [false, false]},
    {"name": "passing_sync$m$8$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$8$m$2$m$2$m$1$m$2"], "postprocess": ([[match]])    => [match, false]},
    {"name": "passing_sync$m$8$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$8$m$2$m$2$m$1$m$3"], "postprocess": ([[match]])    => [false, match]},
    {"name": "passing_sync$m$8$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$8$m$2$m$2$m$1$m$2", "passing_sync$m$8$m$2$m$2$m$1$m$3"], "postprocess": ([[m1], [m2]]) => [m1, m2]},
    {"name": "passing_sync$m$8$m$2$m$2$m$1$m$1", "symbols": ["passing_sync$m$8$m$2$m$2$m$1$m$3", "passing_sync$m$8$m$2$m$2$m$1$m$2"], "postprocess": ([[m1], [m2]]) => [m2, m1]},
    {"name": "passing_sync$m$8$m$2$m$2$m$1", "symbols": ["integer_even", "passing_sync$m$8$m$2$m$2$m$1$m$1"], "postprocess": ([value, [pass, cross]]) => ({ value, pass: pass ? pass[0] : false, cross })},
    {"name": "passing_sync$m$8$m$2$m$2", "symbols": ["passing_sync$m$8$m$2$m$2$m$1"]},
    {"name": "passing_sync$m$8$m$2$m$3", "symbols": [{"literal":" "}]},
    {"name": "passing_sync$m$8$m$2$m$1", "symbols": ["passing_sync$m$8$m$2$m$2"], "postprocess": id},
    {"name": "passing_sync$m$8$m$2$m$1$e$1$s$1", "symbols": ["_", "passing_sync$m$8$m$2$m$3", "_", "passing_sync$m$8$m$2$m$2"]},
    {"name": "passing_sync$m$8$m$2$m$1$e$1", "symbols": ["passing_sync$m$8$m$2$m$1$e$1$s$1"]},
    {"name": "passing_sync$m$8$m$2$m$1$e$1$s$2", "symbols": ["_", "passing_sync$m$8$m$2$m$3", "_", "passing_sync$m$8$m$2$m$2"]},
    {"name": "passing_sync$m$8$m$2$m$1$e$1", "symbols": ["passing_sync$m$8$m$2$m$1$e$1", "passing_sync$m$8$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$8$m$2$m$1", "symbols": [{"literal":"["}, "_", "passing_sync$m$8$m$2$m$2", "passing_sync$m$8$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "passing_sync$m$8$m$2", "symbols": ["passing_sync$m$8$m$2$m$1"]},
    {"name": "passing_sync$m$8$m$3", "symbols": [{"literal":" "}]},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$2$m$2", "symbols": ["passing_sync$m$8$m$2"]},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$2$m$3", "symbols": ["passing_sync$m$8$m$3"]},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$2$m$1", "symbols": [{"literal":"("}, "_", "passing_sync$m$8$m$1$m$2$s$1$m$2$m$2", "_", "passing_sync$m$8$m$1$m$2$s$1$m$2$m$3", "_", "passing_sync$m$8$m$1$m$2$s$1$m$2$m$2", "_", {"literal":")"}], "postprocess": ([, , [[release1]], , , , [[release2]]]) => [release1, release2]},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$2", "symbols": ["passing_sync$m$8$m$1$m$2$s$1$m$2$m$1"]},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$3", "symbols": ["_"]},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$1$e$1", "symbols": []},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$1$e$1$s$1", "symbols": ["passing_sync$m$8$m$1$m$2$s$1$m$3", "passing_sync$m$8$m$1$m$2$s$1$m$2"]},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$1$e$1", "symbols": ["passing_sync$m$8$m$1$m$2$s$1$m$1$e$1", "passing_sync$m$8$m$1$m$2$s$1$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$m$1", "symbols": ["passing_sync$m$8$m$1$m$2$s$1$m$2", "passing_sync$m$8$m$1$m$2$s$1$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,[toss]]) => toss)]},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$e$1", "symbols": [{"literal":"*"}], "postprocess": id},
    {"name": "passing_sync$m$8$m$1$m$2$s$1$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "passing_sync$m$8$m$1$m$2$s$1", "symbols": ["passing_sync$m$8$m$1$m$2$s$1$m$1", "_", "passing_sync$m$8$m$1$m$2$s$1$e$1"]},
    {"name": "passing_sync$m$8$m$1$m$2", "symbols": ["passing_sync$m$8$m$1$m$2$s$1"]},
    {"name": "passing_sync$m$8$m$1$m$1", "symbols": ["_", "passing_sync$m$8$m$1$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_sync$m$8$m$1", "symbols": ["passing_sync$m$8$m$1$m$1"], "postprocess": ([[actions, , mirrored]]) => mirrored ? mirror(actions) : actions},
    {"name": "passing_sync$m$8", "symbols": ["passing_sync$m$8$m$1"]},
    {"name": "passing_sync$m$7$m$2$s$1", "symbols": [{"literal":"<"}, "passing_sync$m$8", {"literal":"|"}, "passing_sync$m$8", {"literal":">"}]},
    {"name": "passing_sync$m$7$m$2", "symbols": ["passing_sync$m$7$m$2$s$1"]},
    {"name": "passing_sync$m$7$m$1", "symbols": ["_", "passing_sync$m$7$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "passing_sync$m$7", "symbols": ["passing_sync$m$7$m$1"], "postprocess": ([[, [first], , [second]]]) => [first, second]},
    {"name": "passing_sync", "symbols": ["passing_sync$m$7"], "postprocess": ([siteswaps]) => finalisePassingSync(siteswaps)},
    {"name": "multihand$m$2$m$2$m$2$m$2", "symbols": ["multihand_toss_alpha"]},
    {"name": "multihand$m$2$m$2$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "multihand$m$2$m$2$m$2$m$1", "symbols": ["multihand$m$2$m$2$m$2$m$2"], "postprocess": id},
    {"name": "multihand$m$2$m$2$m$2$m$1$e$1$s$1", "symbols": ["_", "multihand$m$2$m$2$m$2$m$3", "_", "multihand$m$2$m$2$m$2$m$2"]},
    {"name": "multihand$m$2$m$2$m$2$m$1$e$1", "symbols": ["multihand$m$2$m$2$m$2$m$1$e$1$s$1"]},
    {"name": "multihand$m$2$m$2$m$2$m$1$e$1$s$2", "symbols": ["_", "multihand$m$2$m$2$m$2$m$3", "_", "multihand$m$2$m$2$m$2$m$2"]},
    {"name": "multihand$m$2$m$2$m$2$m$1$e$1", "symbols": ["multihand$m$2$m$2$m$2$m$1$e$1", "multihand$m$2$m$2$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "multihand$m$2$m$2$m$2$m$1", "symbols": [{"literal":"["}, "_", "multihand$m$2$m$2$m$2$m$2", "multihand$m$2$m$2$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "multihand$m$2$m$2$m$2", "symbols": ["multihand$m$2$m$2$m$2$m$1"]},
    {"name": "multihand$m$2$m$2$m$3", "symbols": [{"literal":","}]},
    {"name": "multihand$m$2$m$2$m$1$e$1", "symbols": []},
    {"name": "multihand$m$2$m$2$m$1$e$1$s$1", "symbols": ["_", "multihand$m$2$m$2$m$3", "_", "multihand$m$2$m$2$m$2"]},
    {"name": "multihand$m$2$m$2$m$1$e$1", "symbols": ["multihand$m$2$m$2$m$1$e$1", "multihand$m$2$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "multihand$m$2$m$2$m$1", "symbols": ["multihand$m$2$m$2$m$2", "multihand$m$2$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "multihand$m$2$m$2", "symbols": ["multihand$m$2$m$2$m$1"]},
    {"name": "multihand$m$2$m$3", "symbols": [{"literal":"\n"}]},
    {"name": "multihand$m$2$m$1$e$1", "symbols": []},
    {"name": "multihand$m$2$m$1$e$1$s$1", "symbols": ["_", "multihand$m$2$m$3", "_", "multihand$m$2$m$2"]},
    {"name": "multihand$m$2$m$1$e$1", "symbols": ["multihand$m$2$m$1$e$1", "multihand$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "multihand$m$2$m$1", "symbols": ["multihand$m$2$m$2", "multihand$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "multihand$m$2", "symbols": ["multihand$m$2$m$1"]},
    {"name": "multihand$m$1", "symbols": ["_", "multihand$m$2", "_"], "postprocess": ([, [match]]) => match},
    {"name": "multihand", "symbols": ["multihand$m$1"], "postprocess": ([throws]) => finaliseMultihand(throws)},
    {"name": "multihand$m$4$m$2$m$2$m$2", "symbols": ["multihand_toss_num"]},
    {"name": "multihand$m$4$m$2$m$2$m$3", "symbols": []},
    {"name": "multihand$m$4$m$2$m$2$m$1", "symbols": ["multihand$m$4$m$2$m$2$m$2"], "postprocess": id},
    {"name": "multihand$m$4$m$2$m$2$m$1$e$1$s$1", "symbols": ["_", "multihand$m$4$m$2$m$2$m$3", "_", "multihand$m$4$m$2$m$2$m$2"]},
    {"name": "multihand$m$4$m$2$m$2$m$1$e$1", "symbols": ["multihand$m$4$m$2$m$2$m$1$e$1$s$1"]},
    {"name": "multihand$m$4$m$2$m$2$m$1$e$1$s$2", "symbols": ["_", "multihand$m$4$m$2$m$2$m$3", "_", "multihand$m$4$m$2$m$2$m$2"]},
    {"name": "multihand$m$4$m$2$m$2$m$1$e$1", "symbols": ["multihand$m$4$m$2$m$2$m$1$e$1", "multihand$m$4$m$2$m$2$m$1$e$1$s$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "multihand$m$4$m$2$m$2$m$1", "symbols": [{"literal":"["}, "_", "multihand$m$4$m$2$m$2$m$2", "multihand$m$4$m$2$m$2$m$1$e$1", "_", {"literal":"]"}], "postprocess": ([, , [first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "multihand$m$4$m$2$m$2", "symbols": ["multihand$m$4$m$2$m$2$m$1"]},
    {"name": "multihand$m$4$m$2$m$3", "symbols": []},
    {"name": "multihand$m$4$m$2$m$1$e$1", "symbols": []},
    {"name": "multihand$m$4$m$2$m$1$e$1$s$1", "symbols": ["_", "multihand$m$4$m$2$m$3", "_", "multihand$m$4$m$2$m$2"]},
    {"name": "multihand$m$4$m$2$m$1$e$1", "symbols": ["multihand$m$4$m$2$m$1$e$1", "multihand$m$4$m$2$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "multihand$m$4$m$2$m$1", "symbols": ["multihand$m$4$m$2$m$2", "multihand$m$4$m$2$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "multihand$m$4$m$2", "symbols": ["multihand$m$4$m$2$m$1"]},
    {"name": "multihand$m$4$m$3", "symbols": [{"literal":"\n"}]},
    {"name": "multihand$m$4$m$1$e$1", "symbols": []},
    {"name": "multihand$m$4$m$1$e$1$s$1", "symbols": ["_", "multihand$m$4$m$3", "_", "multihand$m$4$m$2"]},
    {"name": "multihand$m$4$m$1$e$1", "symbols": ["multihand$m$4$m$1$e$1", "multihand$m$4$m$1$e$1$s$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "multihand$m$4$m$1", "symbols": ["multihand$m$4$m$2", "multihand$m$4$m$1$e$1"], "postprocess": ([[first], rest]) => [first, ...rest.map(([,,,[toss]]) => toss)]},
    {"name": "multihand$m$4", "symbols": ["multihand$m$4$m$1"]},
    {"name": "multihand$m$3", "symbols": ["_", "multihand$m$4", "_"], "postprocess": ([, [match]]) => match},
    {"name": "multihand", "symbols": ["multihand$m$3"], "postprocess": ([throws]) => finaliseMultihand(throws)},
    {"name": "multihand_toss_alpha", "symbols": ["letter_capital", "integer"], "postprocess": ([hand, value]) => ({ value, hand })},
    {"name": "multihand_toss_num$e$1", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "multihand_toss_num$e$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "multihand_toss_num", "symbols": [{"literal":"("}, "_", "multihand_toss_num$e$1", "integer", "_", {"literal":","}, "_", "integer", "_", {"literal":")"}], "postprocess": ([, , minus, hand, , , , value]) => ({ value, offset: hand * (minus ? -1 : 1) })}
]
  , ParserStart: "digit"
};

function parse$1( rule, string ){
   
   try{
      return new Parser(grammar.ParserRules, rule).feed(string).results;
   }
   catch(e){
      return [];
   }

}

const declaration = {

   limits: {
      degree: { min: 1, max: 1 }
   },
   hands: () => ["Hand"],
   parse: parse$1.bind(null, "standard_async"),
   unparse: throws => throws.map( ([release]) => release.length === 1 ? release[0].value : `[${release.map(({ value }) => value).join(",")}]`).join(",")

};

function unparseToss({ value, handFrom, handTo }){
   
   return `${value * 2}${handFrom !== handTo ? "x" : ""}`;

}

const declaration$1 = {

   limits: {
      degree: { min: 2, max: 2 }
   },
   hands: () => ["Left", "Right"],
   parse: parse$1.bind(null, "standard_sync"),
   unparse: throws => throws.map( action => "(" + action.map( release => release.length === 1 ? unparseToss(release[0]) : `[${release.map(unparseToss).join(",")}]` ) + ")"  ).join("")

};

const declaration$2 = {

   limits: {
      degree: { min: 1, max: 1 },
      greatestValue: { max: 61 }
   },
   hands: () => ["Hand"],
   parse: parse$1.bind(null, "compressed_async"),
   unparse: throws => throws.map( ([release]) => release.length === 1 ? release[0].value : `[${release.map(({ value }) => value).join("")}]`).join("")

};

function unparseToss$1({ value, handFrom, handTo }){
   
   return `${value * 2}${handFrom !== handTo ? "x" : ""}`;

}

const declaration$3 = {

   limits: {
      degree: { min: 2, max: 2 },
      greatestValue: { max: 61 }
   },
   hands: () => ["Left", "Right"],
   parse: parse$1.bind(null, "compressed_sync"),
   unparse: throws => throws.map( action => "(" + action.map( release => release.length === 1 ? unparseToss$1(release[0]) : `[${release.map(unparseToss$1).join("")}]` ) + ")"  ).join("")

};

const declaration$4 = {

   limits: {
      degree: { min: 2 }
   },
   hands: degree => Array(degree).fill().map((_, i) => `juggler ${i + 1}`),
   parse: parse$1.bind(null, "passing_async"),
   unparse

};

function unparse( throws ){
   
   const count = throws[0].length;
   const strings = [];
   for( let i = 0; i < count; i++ )
      strings.push( throws.map( action => unparseRelease(action[i]) ).join(",") );
   return `<${strings.join("|")}>`;

}

function unparseRelease( release ){
   
   const string = release.map( ({value, handFrom, handTo}) => `${value}${handFrom !== handTo ? `p${handTo + 1}` : ""}`).join(",");
   return release.length === 1 ? string : `[${string}]`;

}

const declaration$5 = {

   limits: {
      degree: { min: 4 }
   },
   hands: degree => Array(degree).fill().map((_, i) => `juggler ${Math.floor(i / 2) + 1}, hand ${i % 2 + 1}`),
   parse: parse$1.bind(null, "passing_sync"),
   unparse: unparse$1

};

function unparse$1( throws ){

   const count = throws[0].length;
   const strings = [];
   for( let i = 0; i < count; i += 2 )
      strings.push( throws.map( action => `(${unparseRelease$1(action[i])},${unparseRelease$1(action[i + 1])})` ).join("") );
   return `<${strings.join("|")}>`;

}

function unparseRelease$1( release ){
   
   const string = release.map( ({value, handFrom, handTo}) => `${value * 2}${handFrom % 2 !== handTo % 2 ? "x" : ""}${handTo === handFrom || handTo === handFrom + (handFrom % 2 ? -1 : 1) ? "" : ("p" + (Math.floor(handTo / 2) + 1))}` ).join(",");
   if( release.length === 1 )
      return string;
   else
      return `[${string}]`;

}

const declaration$6 = {

   hands: alphabetic,
   parse: parse$1.bind(null, "multihand"),
   unparse: unparse$2

};

function unparse$2( throws ){

   const count = throws[0].length;
   const hands = alphabetic(count);
   const rows = [];
   for( let i = 0; i < count; i++ ){
      const row = throws.map(action => unparseRelease$2(action[i], hands)).join(",");
      rows.push(row);
   }
   return rows.join("\n");

}

function unparseRelease$2( release, hands ){

   const string = release.map(({value, handTo}) => `${hands[handTo]}${value}`).join(",");
   return release.length === 1 ? string : `[${string}]`;

}

const notations = {

   "standard:async":   declaration,
   "standard:sync":    declaration$1,
   "standard":         ["standard:async", "standard:sync"],
   "compressed:async": declaration$2,
   "compressed:sync":  declaration$3,
   "compressed":       ["compressed:async", "compressed:sync"],
   "passing:async":    declaration$4,
   "passing:sync":     declaration$5,
   "passing":          ["passing:async", "passing:sync"],
   "multihand":        declaration$6

};

function parse( string, notations$$1 ){

   // Flatten composite notations ("standard" to "standard:async" and "standard:sync").
   notations$$1 = notations$$1.reduce( (r, n) => r.concat(Array.isArray(notations[n]) ? notations[n] : n), [] );

   if( notations$$1.some(notation => typeof notation !== "string" || !notations[notation]) )
      throw new Error("Unsupported notation.");

   // The throws can be passed directly to avoid parsing siteswaps that derived
   // from others by manipulating their .throws.
   if( typeof string === "object" ){
      if( !validOutput(string) || notations$$1.length > 1 )
         throw new Error("Invalid input.");
      return { notation: notations$$1[0], throws: string };
   }

   // When passed a string, try parsing with passed notations, returning the 
   // first successful result.
   for( const notation of notations$$1 ){
      const [throws] = notations[notation].parse(string);
      if( throws && validOutput(throws) )
         return { notation, throws };
   }

   throw new Error("Invalid syntax.");

}


function validOutput( throws ){
   
   if( !Array.isArray(throws) || !throws.length )
      return false;

   for( const action of throws ){
      if( !Array.isArray(action) || action.length !== throws[0].length )
         return false;

      if( action.some(release => !Array.isArray(release) || !release.every(({ value, handFrom, handTo }) => value !== undefined && handFrom !== undefined && handTo !== undefined)) )
         return false;
   }

   return true;

}

function toString( notation = this.notation ){

   if( !this.valid )
      throw new Error("Invalid siteswap.");

   if( !notations[notation] )
      throw new Error("Unsupported notation.");

   // Check if they're compatible.
   if( this.notation !== notation ){
      const limitsFrom = notations[this.notation].limits || {};
      const limitsTo = notations[notation].limits || {};
      const properties = Object.keys(limitsTo);

      if( properties.some(property => limitsTo[property].min > limitsFrom[property].max || limitsTo[property].max < limitsFrom[property].min) )
         throw new Error("Incompatible notations.");

      if( properties.some(property => this[property] > limitsTo[property].max || this[property] < limitsTo[property].min) )
         throw new Error("This siteswap can't be converted to the target notation.");
   }

   return notations[notation].unparse(this.throws);

}

function log(){

   if( !this.valid ){
      console.log("Invalid siteswap.");
      return;
   }

   const lines = [];
   let hands;

   lines.push(`siteswap\n ${this.toString().replace(/\n/g, "\n ")}`);
   lines.push(`notation\n ${this.notation}`);
   lines.push(`degree\n ${this.degree}`);
   lines.push(`props\n ${this.props}`);
   lines.push(`period\n ${this.period}`);
   lines.push(`full period\n ${this.fullPeriod}`);
   lines.push(`multiplex\n ${this.multiplex}`);
   lines.push(`prime\n ${this.prime}`);
   lines.push(`ground state\n ${this.groundState}`);
   

   if( this.degree > 2 ){
      hands = alphabetic(this.degree);

      lines.push("hand labels");
      const oldLabels = notations[this.notation].hands(this.degree);
      const paddings = [];
      paddings.push( this.degree.toString().length + 1 );
      paddings.push( Math.max(...oldLabels.map(({length}) => length)) );
      paddings.push( Math.max(...hands.map(({length}) => length)) );
      for( let i = 0; i < this.degree; i++ ){
         const num   = pad(i + 1, paddings[0]);
         const hand1 = pad(hands[i], paddings[2]);
         const hand2 = pad(oldLabels[i], paddings[1]);
         lines.push( `${num}| ${hand1}${this.notation !== "multihand" ? ` (${hand2})` : ""}` );
      }

   }

   lines.push("throw sequence"); {
      const matrix = [];
      for( const [i, action] of this.throws.entries() ){
         const releases = action.map( (release) => {
            let string;
            if( this.degree <= 2 )
               string = release.map( ({value, handFrom, handTo}) => `${value}${handFrom !== handTo ? "x" : ""}` ).join(",");
            else
               string = release.map( ({value, handFrom, handTo}) => `${value}${hands[handTo]}` ).join(",");
            return release.length === 1 ? string : `[${string}]`;
         } );
         matrix.push( [`${i + 1}|`, ...releases] );
      }

      const paddings = [];
      for( let i = 0; i < matrix[0].length; i++ ){
         paddings.push( Math.max(...matrix.map(row => row[i].length + 1)) );
      }

      lines.push( ...matrix.map(row => row.map((string, i) => pad(string, paddings[i])).join("")) );
   }
   
   lines.push("states"); {
      const padding = this.period.toString().length + 1;
      for( const [i, state] of this.states.entries() ){
         for( const [j, handState] of state.schedule.entries() )
            lines.push( `${pad(j ? " " : (i + 1), padding)}| [${handState.join(",")}]` );
      }
   }

   lines.push("strict states"); {
      const padding = this.fullPeriod.toString().length + 1;
      for( const [i, state] of this.strictStates.entries() ){
         for( const [j, handState] of state.schedule.entries() )
            lines.push( `${pad(j ? "" : (i + 1), padding)}| [${handState.map(balls => `[${balls.length ? balls.join(",") : "-"}]`).join(",")}]` );
      }
   }

   lines.push("orbits"); {
      const padding = this.orbits.length.toString().length + 1;
      for( const [i, orbit] of this.orbits.entries() ){
         lines.push( ...orbit.toString().split("\n").map((row, j) => `${pad(j ? "" : (i + 1), padding)}| ${row}`) );
      }
   }

   lines.push("composition"); {
      const padding = this.composition.length.toString().length + 1;
      for( const [i, prime] of this.composition.entries() ){
         lines.push( ...prime.toString().split("\n").map((row, j) => `${pad(j ? "" : (i + 1), padding)}| ${row}`) );
      }
   }

   lines.push(" ");

   console.log( lines.join("\n") );

}


function pad( string, length ){
   
   if( typeof string !== "string" )
      string = string.toString();

   length++;
   return string.length >= length ? string : `${Array(length - string.length).join(" ")}${string}`;

}

class Siteswap {
   
   constructor( string, notations = "compressed" ){

      try{
         const { throws, notation } = this.parse(string, [].concat(notations));
         this.validate(throws);
         this.truncate(throws);

         this.valid         = true;
         this.notation      = notation;
         this.throws        = throws;
      }
      catch(e){
         this.valid = false;
         this.notation = notations;
         this.error = e.message;
         return this;
      }      
      

      const values       = this.throws.reduce((result, action) => result.concat( ...action.map(release => release.map(({value}) => value)) ), []);

      this.degree        = this.throws[0].length;
      this.props         = values.reduce((sum, value) => sum + value) / this.throws.length;
      this.multiplex     = this.throws.reduce((max, action) => Math.max( max, ...action.map(({length}) => length) ), 0);
      this.greatestValue = Math.max(...values);

      this.states        = this.schedulise(this.throws, false);
      this.strictStates  = this.schedulise(this.throws, true);
      this.orbits        = this.orbitise(this.throws, this.notation);
      this.composition   = this.decompose(this.states, this.throws, this.notation);

      this.period        = this.states.length;
      this.fullPeriod    = this.strictStates.length;
      this.groundState   = this.states.some(({ground}) => ground);
      this.prime         = this.composition.length === 1;

   }

}


Siteswap.prototype.validate     = validate;
Siteswap.prototype.truncate     = truncate;
Siteswap.prototype.schedulise   = schedulise;
Siteswap.prototype.orbitise     = orbitise;
Siteswap.prototype.decompose    = decompose;
Siteswap.prototype.parse        = parse;
Siteswap.prototype.toString     = toString;
Siteswap.prototype.log          = log;

module.exports = Siteswap;

return module.exports;});
});

const _settings$1 = Symbol.for("settings");
 
 
function configure( options ){

   const settings = this[_settings$1];

   if( options.beatDuration !== undefined )
      settings.beatDuration = options.beatDuration;

	if( options.slowdown !== undefined )
		settings.slowdown = options.slowdown;

	if( options.dwell !== undefined )
		settings.dwell = options.dwell;

	if( options.ballColor !== undefined )
		settings.ballColor = options.ballColor;

	if( options.reversed !== undefined )
		settings.reversed = options.reversed;

	const { beatDuration, dwell, slowdown, ballColor, reversed } = settings;

   if( typeof beatDuration !== "number" )
      throw new Error("Invalid configuration (`beatDuration` must be a number).");
   if( beatDuration <= 0 )
      throw new Error("Invalid configuration (`beatDuration` must be positive).");

	if( typeof slowdown !== "number" )
		throw new Error("Invalid configuration (`slowdown` must be a number).");
	if( slowdown <= 0 )
		throw new Error("Invalid configuration (`slowdown` must be positive).");

	if( typeof dwell !== "number" )
		throw new Error("Invalid configuration (`dwell` must be a number).");
	if( dwell < 0 || dwell > 1 )
		throw new Error("Invalid configuration (`dwell` must be in [0-1] range).");

	if( typeof ballColor !== "string" )
		throw new Error("Invalid configuration (`ballColor` must be a string).");
	if( !/^#[0-9a-f]{3}(?:[0-9a-f]{3})?/i.test(ballColor) )
		throw new Error("Invalid configuration (`ballColor` must be a valid css color).");

	if( typeof reversed !== "boolean" )
		throw new Error("Invalid configuration (`reversed` must be a boolean).");

}

class Loop {
      
   constructor( callback ){
      
      this.callback  = callback;
      this.update    = this.update.bind(this);
      this.request   = window.requestAnimationFrame(this.update);
      this.timestamp = null;

   }

   update( now ){

      const delta = this.timestamp ? now - this.timestamp : 0;
      this.timestamp = now;
      this.request = window.requestAnimationFrame(this.update);
      this.callback(delta);

   }

   kill(){

      window.cancelAnimationFrame(this.request);

   }

}

class Ball {
      
   constructor( color ){

      this.position = { x: NaN, y: NaN };
      this.color = color;
      this.animationAt = 0;
      this.animations = [];
      this.elapsed = 0;

   }

   update( delta ){
      
      this.elapsed += delta;

      const animation = this.animations[this.animationAt];
      if( this.elapsed >= animation.duration ){
         this.animationAt = (this.animationAt + 1) % this.animations.length;
         this.elapsed = this.elapsed - animation.duration;
         return this.update(0);
      }

      this.position = animation.getPosition(this.elapsed);

   }

   draw( context, settings ){

      const radius = settings.ballRadius * settings.multiplier;
      const x = this.position.x * settings.multiplier;
      const y = this.position.y * settings.multiplier;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = this.color;
      context.globalAlpha = this.position.y > 0 ? 0.9 : 0.55;
      context.fill();
      context.closePath();

   }

}

const motion = {

   s: (u, a, t) => u * t + 0.5 * a * t * t,
   v: (u, a, s) => Math.sqrt(u * u + 2 * a * s)

};

class ThrowAnimation {
	
	constructor( duration, position, velocity, acceleration ){

      this.duration = duration;

		// Initial position and velocity.
		this.position = position;
		this.velocity = velocity;
		this.acceleration = acceleration;

	}

   // Elapsed time from beginning of animation.
	getPosition( time ){

		const position = {
         x: this.position.x + motion.s(this.velocity.x, this.acceleration.x, time),
         y: this.position.y + motion.s(this.velocity.y, this.acceleration.y, time)
		};
		return position;

	}

}

// With a little help from http://www.lce.hut.fi/teaching/S-114.1100/lect_6.pdf :)

class Polynomial {
   
   constructor( coefficients ){

      this.coefficients = coefficients;

   }

   at( x ){

      return this.coefficients.reduce( (result, current) => current + (x * result) );
      
   }

   differentiate(){

      return new Polynomial(this.coefficients.slice(0, -1).map((c, i, {length}) => (length - i) * c));

   }

}


class Spline {
   
   constructor( points, endpoint1 = 0, endpoint2 = 0 ){

      this.polynomials = [];
      this.xs = points.map( ({x}) => x );
      this.ys = points.map( ({y}) => y );

      const n = this.xs.length;

      const hs = [];
      const qs = [];
      const us = [];
      const vs = [];
      const zs = [];

      for( let i = 0; i < n - 1; i++ ){
         hs[i] = this.xs[i + 1] - this.xs[i];
         qs[i] = (this.ys[i + 1] - this.ys[i]) / hs[i];
      }

      us[0] = 2 * (hs[0] + hs[1]);
      vs[0] = 6 * (qs[1] - qs[0]);
      for( let i = 1; i < n - 1; i++ ){
         us[i] = 2 * (hs[i] + hs[i - 1]) - (hs[i - 1] * hs[i - 1] / us[i - 1]);
         vs[i] = 6 * (qs[i] - qs[i - 1]) - (hs[i - 1] * vs[i - 1] / us[i - 1]);
      }

      zs[0] = endpoint1;
      zs[n - 1] = endpoint2;
      for( let i = n - 2; i > 0; i-- ){
         zs[i] = (vs[i] - hs[i] * zs[i + 1]) / us[i];
      }


      for( let i = 0; i < n - 1; i++ ){
         const d = this.ys[i];
         const c = -(hs[i] * zs[i + 1] / 6) - (hs[i] * zs[i] / 3) + (this.ys[i + 1] - this.ys[i]) / hs[i];
         const b = zs[i] / 2;
         const a = (zs[i + 1] - zs[i]) / (6 * hs[i]);

         this.polynomials.push( new Polynomial([a, b, c, d]) );
      }

   }

   at( x ){

      const xs = this.xs;
      const n = this.polynomials.length;

      const min = Math.min(xs[0], xs[n]);
      const max = Math.max(xs[0], xs[n]);
      if( x < min || x > max )
         throw new Error("Out of bounds.");

      let i = 0;
      // Points going left to right.
      if( xs[0] < xs[n] ){
         while( i < n && x > xs[i + 1] )
            i++;
      }
      // Or right to left.
      else{
         while( i < n && x < xs[i + 1] )
            i++;
      }

      return this.polynomials[i].at(x - xs[i]);

   }

   maximum(){

      const maximum = {
         x: null,
         y: null
      };

      const xs = this.xs;

      for( let i = 0; i < this.polynomials.length; i++ ){

         const der = this.polynomials[i].differentiate();

         const a = der.coefficients[0];
         const b = der.coefficients[1];
         const c = der.coefficients[2];

         // Then we find `x`s for which `f(x) = 0`.
         const delta = Math.sqrt(b * b - 4 * a * c);
         const x1 = (-b + delta) / (2 * a) + xs[i];
         const x2 = (-b - delta) / (2 * a) + xs[i];

         // Then we check if they are parts of visible intervals.
         const min = Math.min(xs[i], xs[i + 1]);
         const max = Math.max(xs[i], xs[i + 1]);

         if( x1 >= min && x1 <= max ){
            const y = this.at(x1);
            if( y > maximum.y ){
               maximum.x = x1;
               maximum.y = y;
            }
         }
         
         if( x2 >= min && x2 <= max ){
            const y = this.at(x2);
            if( y > maximum.y ){
               maximum.x = x2;
               maximum.y = y;        
            }
         }

      }

      return maximum;

   }

}

// All catch animations use the same spline for their trajectories.
// This should probably be expanded to a few splines for different
// types of throws (for example, to same vs to other hand).

const points = [
	{ x: 0,   y: 0   },
	{ x: 5,   y: 30  },
	{ x: 30,  y: 100 },
	{ x: 95,  y: 30  },
	{ x: 100, y: 0   }
];

const spline = new Spline(points);


class CatchAnimation {

	constructor( duration, x1, x2, height ){

      this.duration = duration;
		this.width = (x2 - x1);
		this.yModifier = height / spline.maximum().y;
		this.position = {
			x: x1,
			y: 0
		};

	}

	getPosition( time ){

      const percent = time / this.duration;
		const position = {
			x: this.position.x + percent * this.width,
			y: this.position.y - spline.at(percent * 100) * this.yModifier
		};
		return position;

	}

}

class WaitAnimation {

	constructor( duration, x, y ){

      this.duration = duration;
		this.position = { x, y };

	}

	getPosition(){

		return this.position;

	}

}

const _settings$4 = Symbol.for("settings");

// Resizes the canvas, scales and centers animation. Optionally, the sizes in metres can be
// set (happens in `.prepare()` when the animations are calculated).

function scale( animator, width, height, catchHeight ){

   const context = animator.context;
	const canvas = context.canvas;
	const settings = animator[_settings$4];

	// Set new inner size, in metres.
	if( width && height && catchHeight ){
		settings.innerWidth = width;
		settings.innerHeight = height;
		settings.catchHeight = catchHeight;
	}

	// Set new canvas size.
	canvas.width = canvas.clientWidth;
	canvas.height = canvas.clientHeight;

	// Convert metres to pixels.
	settings.multiplier = Math.max(0, Math.min(
		canvas.width / (settings.innerWidth + settings.ballRadius * 2),
		canvas.height / (settings.innerHeight + settings.ballRadius * 2)
	));

	// Center the animation by translating the canvas. This adjusts for the internal y-origin that
	// matches catch height and the required offset of one screen as y axis will be inverted.
	const surplus = {
		x: Math.max(0, canvas.clientWidth - (settings.innerWidth + settings.ballRadius * 2) * settings.multiplier),
		y: Math.max(0, canvas.clientHeight - (settings.innerHeight + settings.ballRadius * 2) * settings.multiplier)
	};
	const offset = {
		x: surplus.x * 0.5 + settings.ballRadius * settings.multiplier,
		y: surplus.y * 0.5 + settings.ballRadius * settings.multiplier
	};


	context.translate(offset.x, canvas.height - offset.y - settings.catchHeight * settings.multiplier);
	
	// Invert y axis.
	context.scale(1, -1);

}

function lcm( a, b ){

	const greater = Math.max(a, b);
	const smaller = Math.min(a, b);
	let result = greater;
	while( result % smaller !== 0 )
		result += greater;
	return result;

}

const _settings$3 = Symbol.for("settings");
const _balls$2 = Symbol.for("balls");
 



const gravity = { x: 0, y: -9.81 / 1000 };


// Adjust the throw sequence of async patterns by changing the 
// hand sequence from `l` to `l,r`. This should possibly be taken 
// care of on the `Siteswap` level, after some careful devising 
// (one problem being representing a 3 as 3l3r).

// Thinking about this now, it actually might be best to simply 
// convert async to sync ("3" -> "(6x,0)*") and provide an option 
// here to consume that extra beat with the ball still in hand.
// This raises the question of how would "522" behave? Will it 
// consume the third beat?

function strictifyThrows( siteswap ){

	if( siteswap.degree === 2 ){
		return siteswap.throws;
	}

	const throws = [];
	const n = lcm( siteswap.throws.length, 2 );
	for( let i = 0; i < n; i++ ){
		const action = [[], []];
		const release = siteswap.throws[i % siteswap.throws.length][0].map( toss => ({ value: toss.value, handFrom: i % 2, handTo: (i + toss.value) % 2 }) );
		action[i % 2] = release;
		throws.push( action );
	}

	return throws;

}

function clamp( value, min, max ){

   return Math.max(min, Math.min(max, value))

}

// Assign the appropriate animations to balls, which are looped over in `Ball.prototype.update`.

function prepare( animator ){

	const siteswap = animator.siteswap;
	const settings = animator[_settings$3];

   const balls = Array(siteswap.props).fill().map( () => new Ball(settings.ballColor) );
	animator[_balls$2] = balls;


	const beatDuration = settings.beatDuration * siteswap.degree;
   
   // Track throw and catch heights for scaling.
   let maxThrowHeight = 0;
   let maxCatchHeight = 0;
   const maxCatchWidth = 250;

   // Smaller dwell and larger dwell (than 0.5) means smaller gap. Greater value greater gap.
   const handsGap = 350 - (Math.abs(0.5 - settings.dwell) * 200) + ((siteswap.greatestValue - 3) * 15);
	const innerWidth = maxCatchWidth * 2 + handsGap;

   const dwellMultiplier = (3 - siteswap.degree);
	const minDwell = 0.1 * dwellMultiplier;
   const maxDwell = 0.9 * dwellMultiplier;
   const computedDwell = Math.max(minDwell, Math.min(maxDwell, settings.dwell * dwellMultiplier));

	const throws = strictifyThrows(siteswap);
	const n = lcm( throws.length, siteswap.strictStates.length );
	for( let i = 0; i < n; i++ ){

		const action = throws[i % throws.length];
		const schedule = siteswap.strictStates[i % siteswap.strictStates.length].schedule;

		// Determine greatest multiplex count of same throw values. This has to include both hands
		// (if used) as throws happen at the same time, even if one hand has no multiplex tosses.
		// `([553])` => [{ '5-0': 2, '3-0': 1 }]
		const multiplexes = action.map(function(release){
			return release.reduce(function(result, toss){
				const key = `${toss.value}-${toss.handTo}`;
				result[key] = (result[key] || 0) + 1;
				return result;
			}, {});
		});

      const greatestTwinCount = Math.max( ...multiplexes.map(group => Math.max(...Object.keys(group).map(key => group[key])) ));

      // When dwell time is greater than a full beat and there are throw 
      // value(s) of 1, dwell time for that action is diminished.
      let dwell = computedDwell;
      if( computedDwell >= 1 ){
         const ones = multiplexes.reduce( (sum, map) => Math.max(sum, map["1-0"] || 0, map["1-1"] || 0), 0);
         if( ones > 0 )
            dwell = 1 - minDwell;
      }

		for( let h = 0; h < 2; h++ ){

			const release = action[h];

			// "Hand motion" follows the lowest toss when multiplexing.
			const lowestValue = Math.min( ...release.map(({value}) => value) );
         const lowestThrowHeight = motion.s(0, -gravity.y, (lowestValue - dwell) * 0.5 * beatDuration);

			for( let j = 0; j < release.length; j++ ){

				const toss = release[j];
				if( toss.value === 0 )
					continue;
					
				const ball = balls[ schedule[h % siteswap.degree][0][j] - 1 ];

            // Multiplex step (time two twin throws will differ in).
				const dwellStep = greatestTwinCount === 1 ? 0 : Math.min(minDwell, (dwell - minDwell) / (greatestTwinCount - 1));
            const at = --multiplexes[h][toss.value + "-" + toss.handTo];

            // Synchronise tosses and releases when there are multiplex twin tosses.
            let launchTime = dwell - (greatestTwinCount - 1) * dwellStep;
            let waitTime = dwellStep * at;
            let airTime = toss.value - (waitTime + launchTime);

            launchTime *= beatDuration;
            waitTime *= beatDuration;
            airTime *= beatDuration;


            const throwHeight = motion.s(0, -gravity.y, airTime / 2);

            // Smaller dwell and larger dwell means smaller catch width. 2s additionally 
            // lower the width (temporary until they get their own animation).
            const catchWidth = clamp(maxCatchWidth - (Math.abs(0.5 - settings.dwell) * 100), 150, maxCatchWidth) - (lowestValue === 2 ? 50 : 0);

            // Catch height is increased with throw value and launch time, within a limited range.
            const min = settings.ballRadius * 0.5;
            const max = Math.min(1000, 500 + siteswap.greatestValue * 30);
            const base = clamp(launchTime * 0.5 + siteswap.greatestValue * 20, min, max);

            let catchHeight = base * 0.3 + base * 0.7 * lowestValue / siteswap.greatestValue;

            // Adjustments for a really small launchTime (dwell x beatDuration) and throw height.
            catchHeight = Math.min(launchTime * 3, catchHeight);
            catchHeight = Math.min(lowestValue === 2 ? 100 : (lowestThrowHeight * 0.5), catchHeight);


            if( throwHeight > maxThrowHeight )
               maxThrowHeight = throwHeight;
            if( catchHeight > maxCatchHeight )
               maxCatchHeight = catchHeight;
    

    			// Catch animation.
				{
				let x1 = toss.handFrom === 0 ? 0 : innerWidth;
				let x2 = toss.handFrom === 0 ? catchWidth : innerWidth - catchWidth;

				if( settings.reversed )
					[x1, x2] = [x2, x1];

				ball.animations.push( new CatchAnimation(launchTime, x1, x2, catchHeight) );
				}


				// Throw animation.
				{
				let x1 = toss.handFrom === 0 ? catchWidth : innerWidth - catchWidth;
				let x2 = toss.handTo === 0 ? 0 : innerWidth;

				if( settings.reversed ){

					if( toss.handFrom === toss.handTo ){
						[x1, x2] = [x2, x1];
					}
					else{
						x1 += toss.handFrom === 0 ? -catchWidth : catchWidth;
						x2 += toss.handFrom === 0 ? -catchWidth : catchWidth;
					}

				}

				const position = {
					x: x1,
					y: 0
				};

				const velocity = {
					x: (x2 - x1) / (airTime),
					y: motion.v(0, -gravity.y, throwHeight)
				};

				ball.animations.push( new ThrowAnimation(airTime, position, velocity, gravity) );

				// Wait animation.
				if( waitTime > 0 ){
					ball.animations.push( new WaitAnimation(waitTime, x2, 0) );
				}
					
				}
			}
		}
	}

	// Once the throw/catch heights in milimetres are known, we can assign `innerWidth` 
	// and `innerHeight` which are used for scaling and centering.
   const innerHeight = maxThrowHeight + maxCatchHeight;
   scale(animator, innerWidth, innerHeight, maxCatchHeight);


   // Delay initial animations.
   const schedule = siteswap.strictStates[0].schedule;
   for( const state of schedule ){
      for( let beat = 0; beat < state.length; beat++ ){
         for( const id of state[beat] ){
            balls[id - 1].animations[-1] = new WaitAnimation(beat * beatDuration);
            balls[id - 1].animationAt = -1;
         }
      }
   }


}

function clear( context ){

   context.save();
   context.setTransform(1, 0, 0, 1, 0, 0);
   context.clearRect(0, 0, context.canvas.width, context.canvas.height);
   context.restore();

}

const _settings$5 = Symbol.for("settings");
const _paused$2 = Symbol.for("paused");
const _balls$3 = Symbol.for("balls");


function update( animator, delta ){

   const context = animator.context;
   const canvas = context.canvas;
   const settings = animator[_settings$5];
   const balls = animator[_balls$3];
   const paused = animator[_paused$2];

	// Canvas size changed, rescale animation.
	if( canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight ){
		scale(animator);

      // If paused stuff won't redraw, that's why.
		if( paused ){
         for( const ball of balls )
            ball.draw(context, settings);
      }

	}
	
	if( paused ){
		return;
	}

   // Update ball positions.
   clear(context);

   for( const ball of balls ){
      ball.update(delta / settings.slowdown);   
      ball.draw(context, settings);
   }

}

const _paused$1 = Symbol.for("paused");
const _loop$1 = Symbol.for("loop");



function start( siteswap$$1, notation ){

	// Already running.
	if( this[_loop$1] ){
		this.stop();
	}

   if( typeof siteswap$$1 === "string" )
      siteswap$$1 = new siteswap(siteswap$$1, notation);

	this.siteswap = siteswap$$1;

	if( !siteswap$$1.valid ){
		throw new Error("Invalid siteswap.");
	}

	if( siteswap$$1.degree > 2 ){
		throw new Error(`Pattern requires ${siteswap$$1.degree} hands.`);
	}

	if( siteswap$$1.greatestValue === 0 ){
		return;
	}

   prepare(this);

	this[_paused$1] = false;
   this[_loop$1] = new Loop( delta => update(this, delta) );

}

const _balls$4 = Symbol.for("balls");
const _loop$2  = Symbol.for("loop");


function stop(){

   const loop = this[_loop$2];
   if( !loop )
      return;

   clear(this.context);
   loop.kill();
   this[_loop$2] = null;
   this[_balls$4].length = 0;
   this.siteswap = null;

}

const _paused$3 = Symbol.for("paused");

function pause(){

	this[_paused$3] = !this[_paused$3];

}

const _settings$6 = Symbol.for("settings");
const _paused$4 = Symbol.for("paused");
const _balls$5 = Symbol.for("balls");
 

// `id` is an integer assigned to balls (in order of appearance?).

function dye( color, id ){

   const balls = this[_balls$5];
   const settings = this[_settings$6];
   const context = this.context;

   if( id === undefined ){
      for( const ball of balls )
         ball.color = color;
   }
   else{
      if( !balls[id] )
         throw new Error("Ball doesn't exist.");
      balls[id].color = color;
   }
   

   if( this[_paused$4] ){
      clear(context);
      for( const ball of balls )
         ball.draw(context, settings);
   }

}

const _settings = Symbol.for("settings");
const _paused = Symbol.for("paused");
const _balls = Symbol.for("balls");
const _loop = Symbol.for("loop");



class Animator {

	constructor( canvas, options = {} ){

		const element = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
		if( !element )
			throw new Error("Canvas element not supplied.")

		element.addEventListener("click", () => this.pause());


      this.context  = element.getContext("2d");
      this.siteswap = null;

      this[_loop]     = null;
      this[_paused]   = false;
      this[_balls]    = [];
      

		// Default settings.
		this[_settings] = {

         // Configurable by `this.configure`.
         dwell: 0.5,
         slowdown: 1,
         reversed: false,
         ballColor: "#ff3636",
         beatDuration: 300,         // In miliseconds.

         // Not configurable.
			ballRadius: 100,         // In milimetres.
			catchWidth: 400,         // In milimetres.
			innerHeight: 0,          // In milimetres. Set by `.scale()`.
			innerWidth: 0,           // In milimetres. Set by `.scale()`.
			catchHeight: 0,          // In milimetres. Set by `.scale()`.

			multiplier: null        // Pixels per milimetre.

		};

		this.configure(options);

	}
}

Animator.prototype.start     = start;
Animator.prototype.stop      = stop;
Animator.prototype.pause     = pause;
Animator.prototype.configure = configure;
Animator.prototype.dye       = dye;

return Animator;

}());
