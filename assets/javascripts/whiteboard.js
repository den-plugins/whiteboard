/*
Mark Maglana
RBW = Really Big Wall
*/

var Rbw = {};

Rbw.init = function(){
  new Rbw.Whiteboard(d[0]);
}

Rbw.log = function(message){
  // try{
  //   console.log(message);
  // }
  // catch(e){
  //   
  // }
}

Rbw.message = function(message){
  alert(message);
}

/***************************************
              BASE CLASS
***************************************/

Rbw.Model = Class.create({
  initialize: function(data){
    this._data = Object.clone(data);
    this._original_data = data; 
    this._observers = {};
    this.register();
  },
  
  destroy: function(){
    // TODO: More cleaning up needed here
    this.get_element().remove();
  },
  
  register: function(){
    var id = this.get_element().identify();

    var c = this.constructor;

    if(!c._instances) c._instances = {};
    if(c._instances[id] && c._instances[id].destroy)
      c._instances[id].destroy();
    c._instances[id] = this;

    id = this.get_value('id');
    if(!c._instances_by_record_id) c._instances_by_record_id = {};
    if(c._instances_by_record_id[id] && c._instances_by_record_id[id].destroy)
      c._instances_by_record_id[id].destroy();
    c._instances_by_record_id[id] = this;    
  },
  
  get_value: function(key){
    return this._data[key];
  },
  
  set_value: function(key, value) {
    var old_val;
    var hash = {};
    
    if( Object.inspect(key).match(/Object/g)!=null ){
      old_val = this.bulk_update(key);
    } else if(this._data[key]!=value){
      hash[key] = value;
      old_val = this.bulk_update(hash);
    }
    
    var observers = this.get_observers('changed')
    for(var i=0 ; i<observers.length ; i++){
      observers[i](this, key, old_val);
    }
  },
  
  bulk_update: function(obj){
    Rbw.log(this);
    var old = {};
    var data = this._data;
    var keys = Object.keys(obj);
    var key;
    
    for(var i = 0 ; i < keys.length ; i++){
      key = keys[i];
      old[key] = data[key];
      data[key] = obj[key];
      if(this._original_data[key]!==obj[key]) this._is_dirty = true;
    }
    return old;
  },
  
  add_observer: function(event, observer){
    if(this._observers[event]==null) this._observers[event]=[];
    
    this._observers[event].push(observer);
  },
  
  get_observers: function(event){
    if(this._observers[event]==null) this._observers[event]=[];
    
    return this._observers[event];
  },
  
  is_dirty: function() {
    return this._is_dirty;
  },
  
  reload: function(data){
    this._data = Object.clone(data);
    this._original_data = data; 
    var observers = this.get_observers('reloaded');
  
    for(var i=0 ; i<observers.length ; i++){
      observers[i](this);
    }
    this._is_dirty = false;    
  },
  
  raise_event: function(event){
    var observers = this.get_observers(event);
    for(var i=0 ; i<observers.length ; i++){
      observers[i](this);
    }
  }
});

// Prototype 1.6.x doesn't support inheriting class methods
// yet. So we're defining them in a separate object for now
// and bulk adding them 'manually'
Rbw.ModelClassMethods = {
  find: function(obj){
    if(Object.isElement(obj)){
      return this._instances[obj.readAttribute('id')];
    } 
    else {
      return null;
    }
  },
  
  find_by_id: function(id){
    return this._instances_by_record_id[id];
  },

  find_all: function() {
    return Object.values(this._instances);
  }
}

/***************************************
            WHITEBOARD CLASS
***************************************/
Rbw.Whiteboard = Class.create(Rbw.Model, {
  initialize: function($super, data){
    $super(data.whiteboard);
    this.LOOKUPS = data.lookups;

    var myself = this;    
    data.columns.each(function(column_data){
      new Rbw.Column(column_data, myself);
    });
    
    for(var i=0 ; i<data.items.length ; i++){
      var item_data = data.items[i]; 
      var item = new Rbw.Item(item_data, myself);
      Rbw.Column.find_by_id( item.get_value('status_id') ).register_item(item); 
      item.add_observer('changed', this.item_changed.bind(this));
      item.add_observer('reloaded', this.item_reloaded.bind(this));
      item.add_observer('click', this.item_clicked.bind(this));
    }
    
    // make_sortable() needs to be called after ALL columns have
    // been instantiated since we need all to exist first before
    // we can pass a proper containment option to Sortable.create
    Rbw.Column.find_all().each(function(obj){ obj.make_sortable(); obj.sort_items(); });
    
    this._is_dirty = false;
    this.get_element().select(".changed_indicator")[0].hide();
    this.get_element().select(".autosave_button")[0].checked = "checked";
    this.get_element().select(".highlight_related_button")[0].checked = "checked";
    this.get_maximize_on_hover_button().observe('click', this.toggle_maximize_on_hover.bind(this));
    this.get_element().select(".savenow_button")[0].observe('click', this.bulk_update.bind(this));
    this.get_element().select(".chart_button")[0].observe('click', this.toggle_chart.bind(this));
    this.get_element().removeClassName("initializing");
    if(this.get_value('id')=='0') this.get_element().select(".chart_button_span")[0].hide();
  },

  get_element: function(){      
    if(this.element==null){
      this.element = $("rbwwb_" + this.get_value('id'));
    }
    
    return this.element;
  },
  
  get_body: function(){
    return this.get_element().select('.body')[0];
  },
      
  get_maximize_on_hover_button: function(){
    return this.get_element().select('.maximize_on_hover_button')[0];
  },
  
  get_autorenumber_state: function(){
    return false;
  },

  get_autosave_state: function(){
    return this.get_element().select('.autosave_button')[0].checked;
  },

  get_highlight_related_state: function(){
    return this.get_element().select('.highlight_related_button')[0].checked;
  },

  get_users: function(){
    return this.LOOKUPS.users;
  },

  get_current_user_id: function(){
    return this.LOOKUPS.current_user_id;
  },

  toggle_maximize_on_hover: function(){
    if(this.get_maximize_on_hover_button().checked){
      Rbw.Item.find_all().each(function(item){
        item.get_element().addClassName('maximize_on_hover');
      });
    } else {
      Rbw.Item.find_all().each(function(item){
        item.get_element().removeClassName('maximize_on_hover');
      });
    }
  },
  
  toggle_chart: function(event){
    if(this.get_element().select('.chart_button')[0].checked){
      this.get_element().select('.chart')[0].show();
      this.regenerate_chart();
    } else {
      this.get_element().select('.chart')[0].hide();
    }
      
  },
  
  regenerate_chart: function(){
    var chart_div = this.get_element().select('.chart')[0];
    //chart_div.update("loading...");
    new Ajax.Updater(chart_div, 
                     '/whiteboards/chart/'+ this.get_value('id'), 
                     { method: 'post',
                       evalScripts: true
                     });
  },

  start_sprint: function(){
    var chart_div = this.get_element().select('.chart')[0];
    new Ajax.Updater(chart_div, 
                     '/whiteboards/start_sprint/'+ this.get_value('id'), 
                     { method: 'post',
                       evalScripts: true
                     });
  },

  item_changed: function(item, key, old_value){
    if(!this._dirty_items) this._dirty_items = new Hash();
        
    if(item.is_dirty() && this.get_autosave_state()){
      var f = this.get_update_from_server.bind(this);

      new Ajax.Request('/issues/edit/' + item.get_value('id'), 
                      { method: 'post',
                        parameters: item.to_hash(),
                        onComplete: function(transport) { f(item); }
                      });
    }
  },
  
  item_clicked: function(item){
    Rbw.Item.find_all().each(function(i){
      i.get_element().removeClassName('highlight');
      i.get_element().removeClassName('selected');
      i.get_element().setStyle({ backgroundColor: null });
    });
    item.get_element().addClassName('selected');
    if(this.get_highlight_related_state()){
      item.get_value('related_items').each(function(id){
        var i = Rbw.Item.find_by_id(id);
        if(i!=null) i.get_element().addClassName('highlight');
      });
    }
  },

  item_reloaded: function(item){
    // DO NOTHING FOR NOW
  },
  
  bulk_update: function(event){
    var f = this.get_update_from_server.bind(this);
    Rbw.Item.find_all().each(function(item){
      if(item.is_dirty()){
        new Ajax.Request('/issues/edit/' + item.get_value('id'), 
                        { method: 'post',
                          parameters: item.to_hash(),
                          onSuccess: function(transport) { f(item); }
                        });
      }
    });
    event.preventDefault();
  },
  
  get_update_from_server: function(item){
    var f = this.received_update_from_server.bind(this);
    new Ajax.Request('/whiteboards/item/' + item.get_value('id'),
                     { method: 'get',
                       onSuccess: f
                     });
  },
  
  received_update_from_server: function(transport){   
     var i = transport.responseJSON; 
     var item = Rbw.Item.find_by_id(i.id).reload(i);
     // TODO: Handle scenario where an item was removed from this whiteboard
     // TODO: Handle scenario where an item was moved to this whiteboard!
  }
  
});

// Add class methods
Object.keys(Rbw.ModelClassMethods).each(function(key){
  Rbw.Whiteboard[key] = Rbw.ModelClassMethods[key];
});

/***************************************
              COLUMN CLASS
***************************************/

Rbw.Column = Class.create(Rbw.Model, {
  initialize: function($super, data, whiteboard) {
    $super(data);
    this._whiteboard = whiteboard;
  },
  
  get_element: function() {    
    if(this.element==null){
      this.element = $("rbwcol_" + this.get_value('id'));
    }
    
    return this.element;
  },
  
  get_whiteboard: function(){
    return this._whiteboard;
  },
  
  sort_items: function(){
    var id = this.get_element().id;
    var sequence = Sortable.sequence(id);
    Sortable.setSequence(id, sequence.sort(this.sort_by_priority_importance));
  },
  
  sort_by_priority_importance: function(a, b){  
    return Rbw.Item.find_by_id(b).get_weight() - Rbw.Item.find_by_id(a).get_weight();
  },
  
  register_item: function(item){
    item.add_observer('changed', this.item_changed.bind(this));
  },
  
  add_item: function(item){
    this.get_element().insert( item.get_element() );
    this.make_sortable();
    this.updated();
    this.register_item(item);
  },

  item_changed: function(item, key, old_value) {
    if(key!='status_id'){
      this.sort_items();
    } else if(key=='status_id' && item.get_value(key)==this.get_value('id')) {
      this.sort_items();
    }
  },
  
  make_sortable: function(){
    var cols = Rbw.Column.find_all().map(function(obj){ return "rbwcol_"+obj.get_value('id') });
    var f = this.updated.bind(this);
    Sortable.create(this.get_element(), { tag: 'div', 
                          only: 'item', 
                          containment: cols,
                          dropOnEmpty: true,
                          constraints: false,
                          onUpdate: f });
  },
  
  renumber_items: function(){
    // DO NOTHING
  },
  
  updated: function() {
    var column = this; 
    var col_id = column.get_value('id');
    
    column.element.select(".item").each(function(element){
      var item = Rbw.Item.find(element)
      if(item!=null && item.get_value('status_id')!=col_id) item.set_value('status_id', col_id);
    });
    
    if (this.get_whiteboard().get_autorenumber_state()){
      this.renumber_items();
    } else {
      this.sort_items();
    }
  }
  
});

// Add class methods
Object.keys(Rbw.ModelClassMethods).each(function(key){
  Rbw.Column[key] = Rbw.ModelClassMethods[key]; 
});

/***************************************
              ITEM CLASS
***************************************/

Rbw.Item = Class.create(Rbw.Model, {
  initialize: function($super, data, whiteboard){
    $super(data);
    this._whiteboard = whiteboard;
    this.get_element().select('.edit_button')[0].observe('click', this.show_inline_editor.bind(this));
    this.get_element().select('.zoom_button')[0].observe('click', this.toggle_zoom.bind(this));
    this.get_element().observe('click', this.handle_click_event.bind(this));
    this.set_visual_state();
  },
  
  get_value: function($super, key){
    if(key=='points_left'){
      return parseFloat(this.get_value('estimated_hours')) * (1 - parseFloat(this.get_value('done_ratio'))/100);
    } else if(key=='estimated_hours' || key=='done_ratio'){
      var r = $super(key);
      return (r==null) ? 0 : r;
    }
    return $super(key);
  },
  
  set_value: function($super, key, value){
    $super(key, value);
    this.update_element();
    this.get_element().highlight({ duration: 3 });
  },

  bulk_update: function($super, obj){
    if(obj['points_left']!=null) obj = this.eval_points_left(obj);
    $super(obj);
  },
  
  get_element: function() {  
    if(this.element==null){
      this.element = $("rbwitem_" + this.get_value('id'));
    }
    return this.element;
  },
  
  get_whiteboard: function() {
    return this._whiteboard;
  },
  
  get_assigned_to: function() {
    var ret = this.get_whiteboard().LOOKUPS.users[this.get_value('assigned_to_id')];
    if(ret==null){
      return "";
    } else {
      return ret;
    }
  },
  
  // ESTIMATE = 0, % DONE = 0
  // - When points are increased, set ESTIMATE to that value
  // - When points are decreased, do not allow to continue
  // 
  // ESTIMATE = +, % DONE = 0
  // - When points are increased, set ESTIMATE to that value
  // - When points are decreased, set % DONE accordingly
  // 
  // ESTIMATE = +, % DONE = +
  // - When points are increased, increase ESTIMATE and adjust % DONE so that ABSOLUTE DONE is fixed
  // - When points are decreased, set % DONE accordingly
  eval_points_left: function(obj) {
    var hash            = $H(obj);
    var new_points_left = hash.unset('points_left');
    var points_left     = this.get_value('points_left');
    var estimated_hours = this.get_value('estimated_hours');
    var done_ratio      = this.get_value('done_ratio');
    
    if(done_ratio == 0 && new_points_left > points_left) {
      hash.set('estimated_hours', new_points_left);
    } else if(estimated_hours > 0 && new_points_left < points_left) {
      hash.set('done_ratio', (1 - new_points_left/estimated_hours) * 100);
    } else if(estimated_hours > 0 && done_ratio > 0 && new_points_left > points_left) {
      var adjusted_estimate = estimated_hours + (new_points_left - points_left);
      hash.set('estimated_hours', adjusted_estimate);
      hash.set('done_ratio', (1 - new_points_left/adjusted_estimate) * 100);      
    }
    
    return hash.toObject();
  },
  
  update_element: function(){
    this.render_contents();
    this.set_visual_state();
    return this;
  },
  
  render_contents: function(){
    var el = this.get_element();
    el.select('span.importance')[0].innerHTML = this.get_weight();
    el.select('span.points_left')[0].innerHTML = this.get_value('points_left').toFixed(1);
    el.select('span.assigned_to')[0].innerHTML = this.get_value('assigned_to_id')==null ? '' : this.get_whiteboard().get_users()[this.get_value('assigned_to_id')];
    el.select('span.subject')[0].innerHTML = this.get_value('subject');
  },

  set_visual_state: function(){
    var el = this.get_element();
    el.addClassName(this.get_value('type_label'));
    
    if(this.get_value('assigned_to_id')==this.get_whiteboard().get_current_user_id()) el.addClassName('owned_by_user');
    
    if(this.get_value('points_left')==0) {
      el.addClassName('no_points_left');
    } else {
      el.removeClassName('no_points_left');
    }
    
    if(this.is_dirty()){
      this.get_element().addClassName("dirty");
    } else {
      this.get_element().removeClassName("dirty");
    }
  },
  
  toggle_zoom: function(){
    var el= this.get_element();
    if(el.hasClassName('minimized')){
      el.removeClassName('minimized').addClassName('maximized');
    } else {
      el.removeClassName('maximized').addClassName('minimized');      
    }
  },
  
  handle_click_event: function(){
    this.raise_event('click');
  },
  
  get_weight: function(){
    return parseFloat(this.get_value('priority') + "." + this.get_value('importance'));
  },
  
  get_form: function(){
    var el  = $('rbw_edit_form_'+this.get_value('id'));
    
    if(el==null){
       el = new Element('div', { id: 'rbw_edit_form_'+this.get_value('id'), className: 'edit_form' });
       document.body.appendChild(el);
    }
    return el;
  },
  
  show_inline_editor: function(){
    var e    = this.get_element()
    var form = e.select(".form")[0];
    
    e.addClassName("editing");

    form.update(new Element('input', { name: 'points_left', className: 'points_left', value: this.get_value('points_left') }));
    form.insert(new Element('input', { name: 'importance' , className: 'importance', value: this.get_weight() }));
    
    var assigned_to = new Element('select', { name: 'assigned_to', className: 'assigned_to' });
    form.insert(assigned_to);
    assigned_to.insert(new Element('option', { value: '' }));
    var users = this.get_whiteboard().get_users();
    var assigned_to_id = this.get_value('assigned_to_id');
    Object.keys(users).each(function(key){
      var o = new Element('option', { value: key });
      if(assigned_to_id==key) o.writeAttribute('selected');
      o.update(users[key]);
      assigned_to.insert(o);
    });
    var subj = new Element('textarea', { name: 'subject' , className: 'subject' });
    subj.innerHTML = this.get_value('subject');
    form.insert(subj);
    
    e.select('.cancel_button')[0].observe('click', this.cancel_changes.bind(this));    
    e.select('.ok_button')[0].observe('click', this.apply_changes.bind(this));    
  },
  
  cancel_changes: function(){
    this.get_element().removeClassName('editing');
  },
  
  apply_changes: function(){
    var el = this.get_element().select(".form")[0];
    var weight = el.select('[name=importance]')[0].value.split('.');
    var priority = weight[0];
    var importance = weight[1] || 0;
    var priorities = $H(Rbw.Whiteboard.find_all()[0].LOOKUPS.priorities)
    var priority_max = priorities.keys().length;
    var points_left = Math.abs(parseFloat(el.select('[name=points_left]')[0].value));
    
    if(priority > priority_max || priority<1){
      Rbw.message('Priority+Importance should be between 1.xxx to ' + priority_max + '.xxx');
      return false;
    }
    
    var s = el.select('.assigned_to')[0];
    var assigned_to_id = s.options[s.selectedIndex].value;
    
    this.set_value({'importance'     : importance,
                    'priority_id'    : priorities.get(priority),
                    'assigned_to_id' : assigned_to_id,
                    'priority'       : priority, 
                    'points_left'    : points_left,
                    'subject'        : el.select('.subject')[0].value });
                    
    this.get_element().removeClassName('editing');
  },
  
  to_hash: function(){
    var importance_field_name  = "issue[custom_field_values]["+this.get_value('importance_field_id')+"]";
    var points_left_field_name = "issue[custom_field_values]["+this.get_value('points_left_field_id')+"]";
    
    var options = {};
    
    options[importance_field_name]     = this.get_value('importance');
    // options[points_left_field_name]    = this.get_value('points_left');
    options["issue[done_ratio]"]       = this.get_value('done_ratio');
    options["issue[estimated_hours]"]  = this.get_value('estimated_hours');
    options["issue[status_id]"]        = this.get_value('status_id');
    options["issue[subject]"]          = this.get_value('subject');
    options["issue[fixed_version_id]"] = this.get_value('fixed_version_id');
    options["issue[assigned_to_id]"]   = this.get_value('assigned_to_id');
    options["issue[priority_id]"]      = this.get_value('priority_id');
    Rbw.log(options);
    return options;
  },
  
  reload: function($super, data){
    $super(data);
    this.update_element();    
    return this;
  }
});

// Add class methods
Object.keys(Rbw.ModelClassMethods).each(function(key){
  Rbw.Item[key] = Rbw.ModelClassMethods[key];
});

document.observe("dom:loaded", function() { Rbw.init(); });