class WhiteboardsController < ApplicationController
  unloadable
 
  before_filter :find_project, :authorize, :only => [:index, :show]
  
  def index
    # @whiteboards = Whiteboard.find(:all, :project => @project)
  end

  def show  
    @whiteboard = Whiteboard.find_by_id params[:id], 
                                        :project => @project, 
                                        :current_user => find_current_user,
                                        :items_order => :by_column_asc
  end
  
  def item
    render :json => Witem.find_by_id(params[:id]).to_json
  end
  
  def start_sprint
    Whiteboard.start_sprint(params[:id])
    redirect_to :action => 'chart', :id => params[:id]
  end
  
  def chart
    @data = RbwChartData.get_data :whiteboard_id => params[:id]
    if @data.nil? && !Whiteboard.sprint_has_started(params[:id])
      render :partial => 'sprint_not_started'
    elsif @data.nil?
      render :partial => 'no_chart'
    else
      render :partial => 'chart'
    end
  end
  
  private
  
  def find_project
    @project = if params[:id].nil?
                 Project.find(params[:project_id])
               else
                 Version.find(params[:id]).project
               end
  end
end
