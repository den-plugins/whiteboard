class Witem
  def initialize(issue)
    @issue = issue
  end

  def id
    @issue.id
  end

  def importance
    i = @issue.custom_values.detect{|c| c.custom_field.id==importance_field_id}
    i.nil? ? 0 : i.value.to_i
  end

  def assignee_name_or_empty
    @issue.assigned_to.nil? ? "" : @issue.assigned_to.name
  end

  def importance_field_id
    i = CustomField.find_by_name('Importance')
    i.nil? ? 0 : i.id
  end

  def points_left
    estimated_hours * (1 - done_ratio/100)
  end
  
  def estimated_hours
    (@issue.estimated_hours || 0).to_f
  end
  
  def done_ratio
    (@issue.done_ratio || 0).to_f
  end
  
  def type_label
    "rbw_" + @issue.tracker.name.downcase
  end
  
  def related_items
    [@issue.relations_to.map{|i| i.issue_from_id },
     @issue.relations_from.map{|i| i.issue_to_id }].flatten
  end
  
  def column_id
    @issue.status_id
  end

  def priority
    @issue.priority.position
  end

  def to_json(options = {})
    pairs = {}
    
    pairs[:description] = "#{@issue.description[0, 60]}..."
      
    [ :id, 
      :subject, 
      :assigned_to_id, 
      :fixed_version_id,
      :status_id,
      :tracker_id,
      :type_label,
      :priority_id,
      :importance, 
      :points_left, 
      :estimated_hours,
      :done_ratio,
      :importance_field_id, 
      :related_items,
      :priority ].each{|attr| pairs[attr] = attr.to_proc.call(self) }

    pairs.to_json
  end
  
  def self.find_by_id(id)
    Witem.new Issue.find_by_id(id)
  end
  
  def self.find_all_by_whiteboard(whiteboard_id, options = {})
    order = options[:order].nil? ? order_string(:by_column_asc) : order_string(options[:order])
    items = Issue.find_all_by_fixed_version_id(whiteboard_id, :conditions => ["project_id=?", options[:project_id]], :include => [:status], :order => order).map{|issue| Witem.new(issue)}
  end
  
  def self.order_string(which)
    { :by_column_asc  => "issue_statuses.position ASC",
      :by_column_desc => "issue_statuses.position DESC" }[which]
  end

  def method_missing(method, *arguments, &block)
    @issue.send(method, *arguments, &block)
  end  
end