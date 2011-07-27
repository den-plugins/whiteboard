class Whiteboard
  def initialize(data)
    @data = data
  end
  
  def to_json(options = {})
    @data.to_json 
  end
  
  def name
    @data[:whiteboard][:name]
  end
  
  def id
    @data[:whiteboard][:id]
  end
  
  def items
    @data[:items]
  end
  
  def columns
    @data[:columns]
  end
  
  def lookups
    @data[:lookups]
  end
  
  def self.find_by_id(id, options = {})
    # UGLY UGLY UGLY. I know
    # At this point I just want to concentrate on the javascript part
    # since the whole point of this project is to improve interactivity
    # and reduce the click intensiveness of maintaining tickets. As long
    # as I establish a good protocol/API between the client and server,
    # optimizing this part of the plugin can be done later.
    project = options[:project]
    sprint = id.nil? ? nil : Version.find_by_id(id)
    importance_field  = project.issue_custom_fields.detect{|f| f.name.downcase=="importance" }
    points_left_field = project.issue_custom_fields.detect{|f| f.name.downcase=="points left" }

    wb = {}
    wb[:id]          = sprint.nil? ? 0 : sprint.id
    wb[:project_id]  = project.id
    wb[:name]        = sprint.nil? ? "Product Backlog" : sprint.name
    wb[:deadline]    = sprint.nil? ? 0 : sprint.effective_date
    wb[:description] = sprint.nil? ? "Product Backlog Whiteboard" : sprint.description
    columns = IssueStatus.find(:all, :select => "id, name", :order => "position ASC")

    items = Witem.find_all_by_whiteboard(id, :order => options[:items_order], :project_id => project.id )

    lookups = {}
    lookups[:whiteboards] = {}
    project.versions.each {|v| lookups[:whiteboards][v.id] = v.name}

    lookups[:users] = {}
    project.members.each {|m| lookups[:users][m.user.id] = m.name }

    lookups[:priorities] = {}
    Enumeration.find(:all, :conditions => "opt='IPRI'").each { |e| lookups[:priorities][e.position] = e.id }

    lookups[:current_user_id] = options[:current_user].nil? ? nil : options[:current_user].id

    whiteboard = Whiteboard.new({ :whiteboard => wb,
                                  :columns => columns,
                                  :items => items,
                                  :lookups => lookups })
    whiteboard
  end
  
  def self.sprint_has_started(id)
    return (Version.find_by_id(id).rbw_start_date || 1.day.from_now) <= Time.now
  end
  
  def self.start_sprint(id)
    v = Version.find_by_id(id)
    v.rbw_start_date = Time.now
    v.save
  end
end
