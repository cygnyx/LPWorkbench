var Tableau = function(options) {

    this.name = "Tableau";
    this.n_c = 2;
    this.n_v = 4;

    for (var o in options)
	this[o] = options[o];

    this.basis = [];
    this.x = [];
    this.b = [];
    this.a = [];
    this.c = [];
    this.z = 0;
    this.d = [];
    this.w = 0;
    this.obj = 0;

    this.artificals = new Object();

    for (var v = 0; v < this.n_v; v++) {
	this.x[v] = 0;
	this.c[v] = 0;
	this.d[v] = 0;
    }

    for (var r = 0; r < this.n_c; r++) {
	this.basis[r] = -1;
	this.b[r] = 0;
	this.a[r] = [];
	for (var v = 0; v < this.n_v; v++)
	    this.a[r][v] = 0;
    }

    this.circlerow = -1;
    this.circlecol = -1;
}

Tableau.prototype.pivot = function(row, col) {
    var pivotrow = this.a[row];
    var f = 1.0 / pivotrow[col];
    var thisrow;
    for (var i = 0; i < this.n_v; i++)
	pivotrow[i] *= f;
    this.b[row] *= f;
    this.basis[row] = col;
    for (var r = 0; r < this.n_c; r++)
	if (r != row) {
	    thisrow = this.a[r];
	    f = thisrow[col];
	    for (var c = 0; c < this.n_v; c++)
		thisrow[c] = (c == col) ? 0 : (thisrow[c] - pivotrow[c]*f);
	    this.b[r] = this.b[r] - this.b[row]*f;
	}
    if (this.obj == 1) {
	thisrow = this.c;
	f = thisrow[col];
	for (var c = 0; c < this.n_v; c++)
	    thisrow[c] = (c == col) ? 0 : (thisrow[c] - pivotrow[c]*f);
	this.z = this.z - this.b[row] * f;
    }
    var o = this.obj == 1 ? this.d : this.c;
    f = o[col];
    for (var c = 0; c < this.n_v; c++)
	o[c] = (c == col) ? 0 : (o[c] - pivotrow[c]*f);
    if (this.obj == 1)
	this.w = this.w - this.b[row] * f;
    else
	this.z = this.z - this.b[row] * f;
}

Tableau.prototype.circle = function(row, col) {
    this.circlerow = row;
    this.circlecol = col;
}

Tableau.prototype.copy = function(name) {
    var n = new Tableau({name: name, n_c: this.n_c, n_v: this.n_v});
    n.basis = this.basis.slice();
    n.x = this.x.slice();
    n.b = this.b.slice();
    n.a = this.a.slice();
    n.c = this.c.slice();
    n.z = this.z;
    n.d = this.d.slice();
    n.w = this.w;
    n.obj = this.obj;
    n.circlerow = this.circlerow;
    n.circlecol = this.circlecol;
    n.artificals = new Object();

    for (var r = 0; r < this.n_c; r++)
	n.a[r] = this.a[r].slice();

    for (var o in this.artificals)
	n.artificals[o] = this.artificals[o];

    return n;
}

Tableau.prototype.addconstraint = function() {
    var c = this.n_c;

    this.basis[c] = -1;
    this.b[c] = 0;
    this.a[c] = [];

    for (var v = 0; v < this.n_v; v++) {
	this.a[c][v] = 0;
    }

    this.n_c = c+1;
}

Tableau.prototype.deleteconstraint = function(c) {
    this.basis.splice(c,1);
    this.b.splice(c,1);
    this.a.splice(c,1);
    this.n_c--;
}

Tableau.prototype.addvariable = function() {
    var v = this.n_v;
    this.x[v] = 0;
    for (var r = 0; r < this.n_c; r++)
	this.a[r][v] = 0;
    this.c[v] = 0;
    this.d[v] = 0;

    this.n_v = v+1;
}

Tableau.prototype.deletevariable = function(v) {

    this.x.splice(v, 1);
    for (var r = 0; r < this.n_c; r++)
	this.a[r].splice(v, 1);
    this.c.splice(v, 1);
    this.d.splice(v, 1);

    this.n_v--;
}

Tableau.prototype.toString = function() {
    return this.name + "[" + this.n_c + "x" + this.n_v + "]"
}

Tableau.prototype.toURL = function() {
    var res = "";
    var num = ['name','n_c','n_v', 'z', 'w', 'obj'];
    var arr = ['basis', 'x', 'b', 'a', 'c', 'd'];
    var f = "";
    for (var key in this.artificals)
	f += ',' + key;
    for (var key in num)
	res += '&' + num[key] + "=" + encodeURIComponent(this[num[key]]);
    for (var key in arr)
	res += '&' + arr[key] + "=" + encodeURIComponent(this[arr[key]].join(','));

    return res.substring(1) + "&f=" + encodeURIComponent(f.substring(1));
}
