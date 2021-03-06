// Copyright (c) Eric C. Olson, All Rights Reserved

window.onerror = function(message, url, linenumber) {
    console.log("ERROR: line "+linenumber+": " + message + " - " + url);
    return (true);
}

var App = function(options) {

    this.epsilon = Number.EPSILON || 2.2204460492503130808472633361816e-16;
    this.nepsilon = -this.epsilon;
    this.ln10 = Math.log(10);
    this.precision = 0.000001;
    this.max_iterations = 100;

    this.state_edit = 0
    this.state_primal = 1
    this.state_dual = 2
    this.state = this.state_edit

    this.history = []
    this.historyid = "#history";
    this.currentid = "#current";
    this.helpid = "#help";

    this.digits = -1-this.scale(this.epsilon);
    this.tolerance = Math.pow(10, -Math.floor(2.0*this.digits/3.0));

    this.marked = null;
    this.tableauCounter = 0;

    for (var option in options)
	this[option] = options[option];

}

App.prototype.toString = function() {
    return "App [" + this.history.length + "]";
}

App.prototype.clearhistory = function(node, replacep) {
    var historynode = $(this.historyid);
    historynode.children().remove();
    this.history = [];
    this.tableauCounter = 0;
}

App.prototype.show = function(node, replacep) {
    var historynode = $(this.historyid);
    var currentnode = $(this.currentid);

    if (replacep) {
	currentnode.children().remove();
    } else {
	historynode.append(currentnode.children().detach());
    }

    currentnode.append(node);
}

App.prototype.scale = function(n) {
    return Math.trunc(Math.log(n)/this.ln10);
}

App.prototype.circnum = function(o, circlep) {
    circlep = circlep || false;
    return "<span class='" + (circlep ? '':'no') + "circle'>" + this.num2txt(o) + "</span>";
}

App.prototype.num2txt = function(o) {
    var neg = true;
    var x = new Float64Array(4); // x, maxrange, prec, maxden
    var m0 = new Uint32Array(2);
    var m1 = new Uint32Array(2);
    var t = new Uint32Array(4); // ai, t, cnt, max

    x[0] = o;
    x[1] = 0x7FFFFFFF;
    x[2] = this.precision;
    x[3] = 1/Math.pow(x[2],0.5);

    if (x[0] < 0)
	x[0] = -x[0];
    else
	neg = false;

    m0[0] = 1;
    m0[1] = 0;
    m1[0] = 0;
    m1[1] = 1;

    t[2] = 0;
    t[3] = this.max_iterations;

    while (t[2]++ < t[3]) {
	t[0] = x[0];
	t[1] = m1[0] * t[0] + m1[1];
	if (t[1] > x[3])
	    break;

	m1[1] = m1[0];
	m1[0] = t[1];

	t[1] = m0[0] * t[0] + m0[1];
	m0[1] = m0[0];
	m0[0] = t[1];

	x[0] -= t[0];
	if (x[0] < x[2])
	    break;

		x[0] = 1.0 / x[0];
	if (x[0] > x[1])
	    break;
    } 

    return (neg ? "-" : "") + (m1[0] == 1 ? m0[0] : m0[0] + "/" + m1[0]);
}

App.prototype.round = function(n, d) {
    d = d || this.digits;
    var neg = 1;
    if (n > this.epsilon)
	neg = 0;
    else if (n < this.nepsilon)
	n = -n;
    else
	return 0;

    var k = scale(n) - d;
    if (k != 0)
	n = Math.round(n*Math.pow(10, -k)) * Math.pow(10, k);

    return neg ? -n : n;
}

App.prototype.editting = function() {
    return this.state == this.state_edit;
}

App.prototype.pivoting = function() {
    return this.state == this.state_primal || this.state == this.state_dual;
}

App.prototype.primaling = function() {
    return this.state == this.state_primal;
}

App.prototype.dualing = function() {
    return this.state == this.state_dual;
}

App.prototype.xCell = function(i) {
    var res = "<th class='x'>X<sub>"+(i+1)+"</sub>";
    var tab = this.history[0];
    if (tab.n_v > 1) {
	res += "<ul class='xcontext'>";
	res += "<li col='"+(i+1)+"' class='xcontextitem'>Remove</li>";
	res += "</ul>";
    }
    return res + "</th>";
}

App.prototype.render = function() {
    var tab = this.history[0];
    var res = "<table class='Tableau"+(tab == this.marked?' marked':' nomarked')+"'>";

    var t;
    var c;
    var cr = tab.circlerow;
    var cc = tab.circlecol;

    res += "<caption class='name'>"+tab.name+"</caption>";
    res += "<thead><tr>";

    res += "<th class='menucell'><span class='menu noprint'><span>Menu</span>";
    res += "<ul class='menucontext'>";

    function mci (n, v) {
	return "<li class='menucontextitem' menu='" + v + "'>" + n + "</li>";
    }

    function bci (n, r) {
	return "<li row='" + r + "' class='basiscontextitem'>" + n + "</li>";
    }

    if (this.primaling()) {
	res += mci('Edit Mode', 'edit');
	res += mci('Dual Mode', 'dual');
    } else if (this.dualing()) {
	res += mci('Edit Mode', 'edit');
	res += mci('Primal Mode', 'primal');
    } else if (this.editting()) {
	res += mci('Primal Mode', 'primal');
	res += mci('Dual Mode', 'dual');
	res += mci('Add Constraint', 'addcon');
	res += mci('Add Variable', 'addvar');
    }
    if (this.history.length > 1)
	res += mci('Undo', 'undo');
    res += mci('Copy', 'copy');
    if (tab.obj == 1 && tab.w < 100*this.epsilon && tab.w > 100*this.nepsilon)
	res += mci('Copy Excluding Artificals', 'copyxa');

    if (this.marked == null)
	res += mci('Mark & Copy', 'markcopy');
    else
	res += mci('Copy Marked', 'copymark');

    res += mci('Save', 'save');
    res += mci('Instructions', 'instructions');
    res += mci('Example 5', 'example5');

    res += "</ul></span></th>";

    for (var i = 0; i < tab.n_v; i++)
	res += this.xCell(i);
    res += "<th class='rhs'>b</th></tr></thead><tbody>";

    var values;
    for (var r = 0; r < tab.n_c; r++) {
	res += "<tr>";

	values = [];
	res += "<th class='basis' row='"+(r+1)+"'>X";
	if (tab.basis[r] != -1)
	    res += "<sub>"+(tab.basis[r]+1)+"</sub>";

	for (var i = 0; i < tab.n_v; i++)
	    values[i] = i+1;
	for (var i = 0; i < tab.n_c; i++)
	    if (tab.basis[i] != -1)
		values[tab.basis[i]] = -1;

	res += "<ul class='basiscontext'>";
	if (tab.basis[r] != -1)
	    res += bci('X', 0);

	for (var i = 0; i < tab.n_v; i++)
	    if (values[i] != -1)
		res += bci("X<sub>" + values[i] + "</sub>", values[i]);

	if (tab.n_c > 1)
	    res += bci('Remove', -1);

	res += bci('Add Slack Variable', -2);
	res += bci('Add Artifical Variable', -4);
	res += bci('Add Integer Cut', -3);
	res += bci('Create Branch & Bound sub-problems', -5);
	res += "</ul></th>";

	for (var i = 0; i < tab.n_v; i++) {
	    t = this.circnum(tab.a[r][i], r == cr && i == cc);
	    res += "<td class='"+(i in tab.artificals?'Aw':'A')+"' row='"+(r+1)+"' col='"+(i+1)+"'>"+ t +"</td>";
	}
	t = this.num2txt(tab.b[r]);
	res += "<td class='b' row='"+(r+1)+"'>"+t+"</td></tr>";
    }

    res += "<tr><th class='rowlabel'>z</th>";

    for (var i = 0; i < tab.n_v; i++) {
	t = this.num2txt(tab.c[i]);
	res += "<td class='"+(i in tab.artificals?'cw':'c')+"' col='"+(i+1)+"'>"+t+"</td>";
    }
    t = this.num2txt(tab.z);
    res += "<td class='z'>"+t+"</td></tr>";

    if (tab.obj == 1) {
	res += "<tr><th class='rowlabelw'>w</th>";

	for (var i = 0; i < tab.n_v; i++) {
	    t = this.num2txt(tab.d[i]);
	    res += "<td class='cw' col='"+(i+1)+"'>"+t+"</td>";
	}
	t = this.num2txt(tab.w);
	res += "<td class='w'>"+t+"</td></tr>";
    }

    return res + "</tbody></table>";
}

App.prototype.updateproblem = function() {
    var tab = this.history[0];
    var html = this.render();
    this.show(html, true);
}

App.prototype.stackproblem = function() {
    var tab = this.history[0];
    var html = this.render();
    this.show(html, false);
}

App.prototype.residualfloor = function(x) {
    var res = Math.floor(x);
    res = x - res; // must be positive
    if (res < this.epsilon || (res - 1) > this.nepsilon)
	return 0;
    return res;
}

App.prototype.bandb = function(basisrow) {
    var tab = this.history[0];
    var tabL = tab.copy();
    var t = Math.floor(tab.b[basisrow]);
    tabL.name = tab.name + ' - branch below ' + t;
    var v = tab.basis[basisrow];
    if (v < 0 || v >= n_v)
	return;
    var br = tab.a[basisrow];
    var n_v = tab.n_v;
    var n_c = tab.n_c;
    tabL.addvariable();
    tabL.addconstraint();
    tabL.basis[n_c] = n_v;
    var tabH = tabL.copy();
    tabH.name = tab.name + ' - branch above ' + (t+1);
    var brL = tabL.a[n_c];
    var brH = tabH.a[n_c];

    for (var i = 0; i < n_v; i++) {
	if (i == v) {
	    brL[i] = 0;
	    brH[i] = 0;
	} else {
	    brL[i] = -br[i];
	    brH[i] = br[i];
	}
    }

    brL[n_v] = 1;
    brH[n_v] = 1;
    tabL.b[n_c] = t - tabL.b[basisrow];
    tabH.b[n_c] = tabL.b[basisrow] - (t+1);

    window.open(window.location.origin + window.location.pathname + '?' + tabL.toURL(), '_blank');
    window.open(window.location.origin + window.location.pathname + '?' + tabH.toURL(), '_blank');
}

App.prototype.cutGomory = function(basisrow) {
    var tab = this.history[0];
    var v = tab.basis[basisrow];
    var n_v = tab.n_v;
    var n_c = tab.n_c;
    if (v < 0 || v >= n_v)
	return;
    var br = tab.a[basisrow];
    tab.addvariable();
    tab.addconstraint();
    var cr = tab.a[n_c];
    var t;
    for (var i = 0; i < n_v; i++) {
	t = this.residualfloor(br[i]);
	if (t != 0)
	    cr[i] = -t
    }
    cr[n_v] = 1;
    tab.b[n_c] = -this.residualfloor(tab.b[basisrow]);
    tab.basis[n_c] = n_v;
}

App.prototype.newname = function() {
    return 'Tableau ' + ++this.tableauCounter;
}

App.prototype.example5 = function() {
    this.clearhistory();
    var tab = new Tableau({n_c: 2, n_v:2});
    tab.basis[0] = -1;
    tab.basis[1] = -1;
    tab.b[0] = 6;
    tab.b[1] = 5;
    tab.a[0][0] = 3;
    tab.a[0][1] = 2;
    tab.a[1][0] = 1;
    tab.a[1][1] = 2;
    tab.c[0] = -5;
    tab.c[1] = -4;
    tab.z = 0;
    tab.name = this.newname();
    this.state = this.state_edit;
    this.history.unshift(tab);
    var html = this.render();
    this.show(html, true);
}

App.prototype.undo = function(p, xa) {
    if (app.history.length > 1) {
	app.history.shift();
	$('#history .Tableau:last-child').remove();
	var tab = app.history[0];
	tab.circlerow = -1;
	tab.circlecol = -1;
    }
}

App.prototype.copy = function(p, xa) {
    var n = p.copy();
    n.name = this.newname();
    if (xa) {
	for (var o in p.artificals) {
	    n.deletevariable(o);
	}
	n.obj = 0;
	n.artificals = new Object();
    }
    this.history.unshift(n);
    this.show(this.render(), false);
}

App.prototype.newproblem = function() {
    this.clearhistory();
    var params = decodeURIComponent(window.location.search.substring(1)).split('&');
    var kv;
    var i, j, k;
    var a = new Object();
    for (i = 0; i < params.length; i++) {
	kv = params[i].split('=');
	a[kv[0]] = kv[1];
    };
    var tab, opts;
    if ('n_c' in a && 'n_v' in a) {
	opts = {n_c: parseInt(a['n_c']), n_v: parseInt(a['n_v'])};
	if ('name' in a)
	    opts['name'] = a['name'];
	tab = new Tableau(opts);
	if ('basis' in a) {
	    k = a['basis'].split(',');
	    for (i = 0; i < tab.n_c; i++)
		tab.basis[i] = parseInt(k[i]);
	}
	if ('b' in a) {
	    k = a['b'].split(',');
	    for (i = 0; i < tab.n_c; i++)
		tab.b[i] = parseFloat(k[i]);
	}
	if ('a' in a) {
	    k = a['a'].split(',');
	    for (i = 0; i < tab.n_c; i++)
		for (j = 0; j < tab.n_v; j++)
		    tab.a[i][j] = parseFloat(k[i*tab.n_v+j]);
	}
	if ('c' in a) {
	    k = a['c'].split(',');
	    for (i = 0; i < tab.n_v; i++)
		tab.c[i] = parseFloat(k[i]);
	}
	if ('d' in a) {
	    k = a['d'].split(',');
	    for (i = 0; i < tab.n_v; i++)
		tab.d[i] = parseFloat(k[i]);
	}
	if ('f' in a) {
	    k = a['f'].split(',');
	    for (i in k)
		if (k[i] != "")
		    tab.artificals[parseInt(k[i])] = 1;
	}
	if ('z' in a)
	    if (a['z'] != "")
		tab.z = parseFloat(a['z']);
	if ('w' in a)
	    if (a['w'] != "")
		tab.w = parseFloat(a['w']);
	if ('obj' in a)
	    if (a['obj'] != "")
		tab.obj = parseInt(a['obj']);
    } else {
	opts = {n_c: 2, n_v: 5};
	tab = new Tableau({n_c: 2, n_v:5});
	tab.basis[0] = 2;
	tab.basis[1] = 1;
	tab.b[0] = 6;
	tab.b[1] = 15;
	tab.a[0][0] = -6;
	tab.a[0][1] = 0;
	tab.a[0][2] = 1;
	tab.a[0][3] = -2;
	tab.a[0][4] = 2;
	tab.a[1][0] = -3;
	tab.a[1][1] = 1;
	tab.a[1][2] = 0;
	tab.a[1][3] = 6;
	tab.a[1][4] = 3;
	tab.c[0] = 5;
	tab.c[1] = 0;
	tab.c[2] = 0;
	tab.c[3] = 3;
	tab.c[4] = -2;
	tab.z = -21;
	tab.name = 'Tableau ' + ++this.tableauCounter;
    }

    app.state = app.state_edit;
    this.history.unshift(tab);
    var html = this.render();
    this.show(html, true);
}

var app = new App();

function init() {
    $('#instructions').removeClass("visible");
    $(app.helpid).addClass('visible');

    var cid = app.currentid;
    var act = 'click';

    app.newproblem();

    $(cid).on('mouseenter', '.b', function (e) {
	    if (app.editting())
		return;
	    var row = $(this).attr("row") - 1;
	    var tab = app.history[0];
	    var cell = $("<span class='decimal'>"+tab.b[row]+"</span>");
	    var f = $(this).position();
	    cell.css({ top: f.top+$(this).height()*1.1, left: f.left+$(this).width()*1.1 });
	    $(this).append(cell);
	});
    $(cid).on('mouseleave', '.b', function () {
	    $(this).find(".decimal").remove();
	});

    $(cid).on('mouseenter', '.z', function (e) {
	    if (app.editting())
		return;
	    var tab = app.history[0];
	    var cell = $("<span class='decimal'>"+tab.z+"</span>");
	    var f = $(this).position();
	    cell.css({ top: f.top+$(this).height()*1.1, left: f.left+$(this).width()*1.1 });
	    $(this).append(cell);
	});
    $(cid).on('mouseleave', '.z', function () {
	    $(this).find(".decimal").remove();
	});

    $(cid).on('mouseenter', '.w', function (e) {
	    if (app.editting())
		return;
	    var tab = app.history[0];
	    var cell = $("<span class='decimal'>"+tab.w+"</span>");
	    var f = $(this).position();
	    cell.css({ top: f.top+$(this).height()*1.1, left: f.left+$(this).width()*1.1 });
	    $(this).append(cell);
	});
    $(cid).on('mouseleave', '.w', function () {
	    $(this).find(".decimal").remove();
	});

    $(cid).on('mouseenter', '.c', function (e) {
	    if (app.editting())
		return;
	    var tab = app.history[0];
	    var col = $(this).attr("col") - 1;
	    var cell = $("<span class='decimal'>"+tab.c[col]+"</span>");
	    var f = $(this).position();
	    cell.css({ top: f.top+$(this).height()*1.1, left: f.left+$(this).width()*1.1 });
	    $(this).append(cell);
	});
    $(cid).on('mouseleave', '.c', function () {
	    $(this).find(".decimal").remove();
	});

    $(cid).on('mouseenter', '.cw', function (e) {
	    if (app.editting())
		return;
	    var tab = app.history[0];
	    var col = $(this).attr("col") - 1;
	    var cell = $("<span class='decimal'>"+tab.d[col]+"</span>");
	    var f = $(this).position();
	    cell.css({ top: f.top+$(this).height()*1.1, left: f.left+$(this).width()*1.1 });
	    $(this).append(cell);
	});
    $(cid).on('mouseleave', '.cw', function () {
	    $(this).find(".decimal").remove();
	});

    $(cid).on('mouseenter', '.A', function (e) {
	    if (app.editting())
		return;
	    var row = $(this).attr("row") - 1;
	    var col = $(this).attr("col") - 1;
	    var tab = app.history[0];
	    var den = tab.a[row][col];
	    if (den > app.nepsilon && den < app.epsilon)
		return;
	    var ratio;
	    var cell;
	    var f;

	    if (app.primaling() && tab.c[col] != 0.0) {
		ratio = tab.b[row] / den;
		cell = $("<span class='ratio'>"+ratio+"</span>");
	    } else if (app.dualing() && tab.c[col] != 0.0) {
		ratio = (tab.obj == 1 ? tab.d[col] : tab.c[col]) / den;
		cell = $("<span class='ratio'>"+ratio+"</span>");
	    } else
		cell = null;
	    if (cell) {
		f = $(this).position();
		cell.css({ top: f.top+$(this).height()*1.1, left: f.left+$(this).width()*1.1 });
		$(this).append(cell);
	    }
	});
    $(cid).on('mouseleave', '.A', function () {
	    $(this).find(".ratio").remove();
	});

    $(document).on('keyup', function(e) {
	    switch (e.keyCode) {
	    default:
		break;
	    case 69: // e
		$(app.helpid).removeClass('visible');
		app.state = app.state_edit;
		break;
	    case 80: // p
		$(app.helpid).removeClass('visible');
		app.state = app.state_primal;
		break;
	    case 68: // d
		$(app.helpid).removeClass('visible');
		app.state = app.state_dual;
		break;
	    case 85: // u
		$(app.helpid).removeClass('visible');
		app.undo();
		app.updateproblem();
		break;
	    }
	});

    $(cid).on(act, '.A', function (e) {
	    if (app.primaling()) {
		var row = $(this).attr("row") - 1;
		var col = $(this).attr("col") - 1;
		var tab = app.history[0];
		var n = tab.copy('Tableau ' + ++app.tableauCounter);
		tab.circle(row, col);
		n.pivot(row, col);
		app.updateproblem();
		app.history.unshift(n);
		app.stackproblem();
	    } else if (app.dualing()) {
		var row = $(this).attr("row") - 1;
		var col = $(this).attr("col") - 1;
		var tab = app.history[0];
		var n = tab.copy('Tableau ' + ++app.tableauCounter);
		tab.circle(row, col);
		n.pivot(row, col);
		app.updateproblem();
		app.history.unshift(n);
		app.stackproblem();
	    } else {
		var OriginalContent = $(this).children().first().text();
		$(this).addClass("cellEditing");
		$(this).html("<input type='text' value='" + OriginalContent + "' />");
		var cell = $(this).children().first();
		cell.focus();
		cell.keydown(function (e) {
			if (e.which == 9) {
			    e.preventDefault();
			    var newContent = eval($(this).val());
			    var row = $(this).parent().attr("row") - 1;
			    var col = $(this).parent().attr("col") - 1;
			    app.history[0].a[row][col] = newContent;
			    $(this).parent().removeClass("cellEditing");
			    $(this).parent().html(app.circnum(newContent));
			    col++;
			    if (col == app.history[0].n_v) {
				row++;
				col++;
				$(cid).find(".b[row='"+row+"']").trigger(act);
			    } else {
				row++;
				col++;
				$(cid).find(".A[row='"+row+"'][col='"+col+"']").trigger(act);
			    }
			} else if (e.which == 13) {
			    var newContent = eval($(this).val());
			    var row = $(this).parent().attr("row") - 1;
			    var col = $(this).parent().attr("col") - 1;
			    app.history[0].a[row][col] = newContent;
			    $(this).parent().removeClass("cellEditing");
			    $(this).parent().html(app.circnum(newContent));
			}
		    });
		cell.mouseleave(function (e) {
			$(this).parent().removeClass("cellEditing");
			$(this).parent().html(OriginalContent);
		    });
		cell.blur(function(){
			$(this).parent().removeClass("cellEditing");
			$(this).parent().html(OriginalContent);
		    });
	    }
	});

    $(cid).on(act, '.b', function (e) {
	    if (app.pivoting())
		return;
	    var OriginalContent = $(this).children().first().text();
	    $(this).addClass("cellEditing");
	    $(this).html("<input type='text' value='" + OriginalContent + "' />");
	    var cell = $(this).children().first();
	    cell.focus();
	    cell.keydown(function (e) {
		    if (e.which == 9) {
			e.preventDefault();
			var newContent = eval($(this).val());
			var row = $(this).parent().attr("row") - 1;
			app.history[0].b[row] = newContent;
			$(this).parent().removeClass("cellEditing");
			$(this).parent().html(app.num2txt(newContent));
			row++;
			if (row < app.history[0].n_c) {
			    row++;
			    $(cid).find(".A[row='"+row+"'][col='1']").trigger(act);
			} else {
			    $(cid).find(".c[col='1']").trigger(act);
			}
		    } else if (e.which == 13) {
			var newContent = eval($(this).val());
			var row = $(this).parent().attr("row") - 1;
			app.history[0].b[row] = newContent;
			$(this).parent().removeClass("cellEditing");
			$(this).parent().html(app.num2txt(newContent));
		    }
		});
	    cell.blur(function(){
		    $(this).parent().removeClass("cellEditing");
		    $(this).parent().html(OriginalContent);
		});
	});

    $(cid).on(act, '.c', function (e) {
	    if (app.pivoting())
		return;
	    var OriginalContent = $(this).children().first().text();
	    $(this).addClass("cellEditing");
	    $(this).html("<input type='text' value='" + OriginalContent + "' />");
	    var cell = $(this).children().first();
	    cell.focus();
	    cell.keydown(function (e) {
		    if (e.which == 9) {
			e.preventDefault();
			var newContent = eval($(this).val());
			var col = $(this).parent().attr("col") - 1;
			app.history[0].c[col] = newContent;
			$(this).parent().removeClass("cellEditing");
			$(this).parent().html(app.num2txt(newContent));
			col++;
			if (col < app.history[0].n_v) {
			    col++;
			    $(cid).find(".c[col='"+col+"']").trigger(act);
			} else {
			    $(cid).find(".z").trigger(act);
			}
		    } else if (e.which == 13) {
			var newContent = eval($(this).val());
			var col = $(this).parent().attr("col") - 1;
			app.history[0].c[col] = newContent;
			$(this).parent().removeClass("cellEditing");
			$(this).parent().html(app.num2txt(newContent));
		    }
		});
	    cell.blur(function(){
		    $(this).parent().removeClass("cellEditing");
		    $(this).parent().html(OriginalContent);
		});
	});

    $(cid).on(act, '.z', function (e) {
	    if (app.pivoting())
		return;
	    var OriginalContent = $(this).children().first().text();
	    $(this).addClass("cellEditing");
	    $(this).html("<input type='text' value='" + OriginalContent + "' />");
	    var cell = $(this).children().first();
	    cell.focus();
	    cell.keydown(function (e) {
		    if (e.which == 9) {
			e.preventDefault();
			$(cid).find(".A[row='1'][col='1']").trigger(act);
		    } else if (e.which == 13) {
			var newContent = eval($(this).val());
			app.history[0].z = newContent;
			$(this).parent().removeClass("cellEditing");
			$(this).parent().html(app.num2txt(newContent));
		    }
		});
	    cell.blur(function(){
		    $(this).parent().removeClass("cellEditing");
		    $(this).parent().html(OriginalContent);
		});
	});

    $(cid).on(act, '.name', function (e) {
	    if (app.pivoting())
		return;
	    var OriginalContent = $(this).children().first().text();
	    $(this).addClass("cellEditing");
	    $(this).html("<input type='text' value='" + OriginalContent + "' />");
	    var cell = $(this).children().first();
	    cell.focus();
	    cell.keypress(function (e) {
		    if (e.which == 13) {
			var newContent = $(this).val();
			app.history[0].name = newContent;
			$(this).parent().removeClass("cellEditing");
			$(this).parent().html(newContent);
		    }
		});
	    cell.blur(function(){
		    $(this).parent().removeClass("cellEditing");
		    $(this).parent().html(OriginalContent);
		});
	});

    $(cid).on(act, '.menu', function (e) {
	    var cell = $(this).find('.menucontext').first();
	    cell.addClass('visible');
	    cell.css({ top: e.pageY-1, left: e.pageX-1 });
	    cell.mouseleave(function() {
		    cell.removeClass('visible');
		});
	});


    $(cid).on(act, '.menucontextitem', function (e) {
	    $(app.helpid).removeClass('visible');
	    var act = $(this).attr('menu');
	    if (act == "edit") {
		app.state = app.state_edit;
	    } else if (act == "primal") {
		app.state = app.state_primal;
	    } else if (act == "dual") {
		app.state = app.state_dual;
	    } else if (act == "addvar") {
		app.history[0].addvariable();
	    } else if (act == "addcon") {
		app.history[0].addconstraint();
	    } else if (act == "example5") {
		app.example5();
	    } else if (act == "markcopy") {
		app.marked = app.history[0];
		app.updateproblem();
		app.copy(app.marked, false);
	    } else if (act == "copymark") {
		var m = app.marked;
		app.marked = null;
		app.copy(m, false);
	    } else if (act == "copy") {
		app.copy(app.history[0], false);
	    } else if (act == "copyxa") {
		app.copy(app.history[0], true);
	    } else if (act == "save") {
		window.open(window.location.origin + window.location.pathname + '?' + app.history[0].toURL(), '_blank');
	    } else if (act == "undo") {
		app.undo();
	    } else if (act == "instructions") {
		$('#instructions').toggleClass("visible");
	    }
	    app.updateproblem();
	});

    $(cid).on(act, '.basis', function (e) {
	    if (app.pivoting())
		return
	    var cell = $(this).find('.basiscontext').first();
	    cell.addClass('visible');
	    cell.css({ top: e.pageY-1, left: e.pageX-1 });
	    cell.mouseleave(function() {
		    cell.removeClass('visible');
		});
	});

    $(cid).on(act, '.basiscontextitem', function (e) {
	    var r = $(this).attr("row") - 1;

	    var basiscontext = $(this).parent();
	    basiscontext.removeClass('visible');
	    var basiscell = basiscontext.parent();
	    var basisrow = basiscell.attr("row") - 1;

	    var tab = app.history[0];

	    switch (r) {
	    case -5: // Artifical variable
		tab.addvariable();
		tab.artificals[tab.n_v-1] = 1;
		if (tab.obj == 0) {
		    tab.obj = 1;
		    for (var i = 0; i < tab.n_v; i++)
			tab.d[i] = 0;
		    tab.w = 0;
		}
		var br = tab.a[basisrow];
		for (var i = 0; i < tab.n_v-1; i++)
		    tab.d[i] -= br[i];
		br[tab.n_v-1] = 1;
		tab.d[tab.n_v-1] = 0;
		tab.w -= tab.b[basisrow];
		tab.basis[basisrow] = tab.n_v-1;
		break;
	    case -6: // branch & bound
		app.bandb(basisrow);
		break;
	    case -4: // A cut for integer problem
		app.cutGomory(basisrow);
		break;
	    case -3: // Add slack variable
		tab.addvariable();
		tab.a[basisrow][tab.n_v-1] = 1;
		tab.basis[basisrow] = tab.n_v-1;
		break;
	    case -2: // delete
		tab.deleteconstraint(basisrow);
		break;
	    default:
		tab.basis[basisrow] = r;
		break;
	    }

	    app.updateproblem();
	});

    $(cid).on(act, '.x', function (e) {
	    if (app.pivoting())
		return
	    var cell = $(this).find('.xcontext').first();
	    cell.addClass('visible');
	    cell.css({ top: e.pageY-1, left: e.pageX-1 });
	    cell.mouseleave(function() {
		    cell.removeClass('visible');
		});
	});

    $(cid).on(act, '.xcontextitem', function (e) {
	    var c = $(this).attr("col") - 1;

	    var xcontext = $(this).parent();
	    xcontext.removeClass('visible');
	    var xcell = xcontext.parent();

	    var tab = app.history[0];
	    var tbody = xcell.parent().parent();

	    tab.deletevariable(c);

	    app.updateproblem();
	});
}

$(init)
