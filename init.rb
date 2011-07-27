require 'redmine'

Redmine::Plugin.register :redmine_really_big_wall do
  name 'Really Big Wall plugin'
  author 'Mark Maglana'
  description 'Holds whiteboards where tickets can be tracked a la scrum'
  version '0.0.1'
  
  project_module :whiteboards do
    permission :list_whiteboards, :whiteboards => :index
    permission :view_whiteboards, :whiteboards => [:show, :item]
  end
  
  menu :project_menu, 
       :whiteboards, 
       { :controller => 'whiteboards', :action => 'index' }, 
       :caption => 'Whiteboards',
       :after => :issues,
       :param => :project_id
end