class RbwChartData < ActiveRecord::Base
  set_table_name 'rbw_chart_data'
  
  def self.generate_data(id)
    version    = Version.find_by_id(id)
    return nil if (!version.effective_date.nil? && version.effective_date < Date.today) ||
                  (!self.has_data(id) && !Whiteboard.sprint_has_started(id))
    
    data_today = RbwChartData.find :first, :conditions => ["whiteboard_id=? AND extract(year from created_at)=? AND extract(month from created_at)=? AND extract(day from created_at)=?", id, Time.now.year, Time.now.month, Time.now.day]
    scope = Issue.sum('estimated_hours', :conditions => ["fixed_version_id=?", id])
    done  = Issue.sum('hours_done', :select => 'estimated_hours*(cast(done_ratio as float)/100)', :conditions => ["fixed_version_id=?", id])
    
    if data_today.nil?
      create :scope => scope, :done => done, :whiteboard_id => id
    else
      data_today.scope = scope
      data_today.done  = done
      data_today.save!
    end
    data_today
  end
  
  def self.has_data(whiteboard_id)
    return count(:conditions => ["whiteboard_id=?", whiteboard_id]) > 0
  end
  
  def self.get_data(options = {})
    generate_data options[:whiteboard_id]
    data = find_all_by_whiteboard_id options[:whiteboard_id], :order => "created_at ASC"
    
    return nil if data.nil? || data.length==0
    
    end_date    = Version.find_by_id(options[:whiteboard_id]).effective_date || 30.days.from_now.to_date
    data_points = (end_date - data.first.created_at.to_date).to_i + 1
    scope = []
    done  = [] 
    days  = []
    
    data.each do |d|
      scope << d.scope
      done  << d.done
      days  << d.created_at
    end
    
    (1..(data_points-days.length)).to_a.each do |i|
      days << days.last + 1.day
    end

    scope = scope.fill(scope.last, scope.length, data_points - scope.length)
    
    speed = (done.last - done.first).to_f / done.length
    
    best  = [done.last]
    worst = [done.last]
    
    if done.length > 1
      while best.last < scope.last && best.last > 0 && (best.length+done.length <= scope.length)
        best << (best.last + speed*1.5).precision(2)
      end
      best[best.length-1] = best.last > scope.last ? scope.last : best.last
    
      while worst.last < scope.last && worst.last > 0 && (worst.length+done.length <= scope.length)
        worst << (worst.last + speed*0.5).precision(2)
      end
      worst[worst.length-1] = worst.last > scope.last ? scope.last : worst.last
    end
    
    {
      :days    => days,
      :scope   => scope,
      :scope_x => (0...scope.length).to_a,
      :done    => done,
      :done_x  => (0...done.length).to_a,
      :best    => best,
      :best_x  => (0...best.length).to_a.map{|n| n+done.length-1},
      :worst   => worst,
      :worst_x => (0...worst.length).to_a.map{|n| n+done.length-1}
    }
  end
end
