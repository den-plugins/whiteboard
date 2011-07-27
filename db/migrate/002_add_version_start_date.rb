class AddVersionStartDate < ActiveRecord::Migration
  def self.up
    if !Version.columns.collect {|v| v.name}.include?("rbw_start_date")
      add_column :versions, :rbw_start_date, :datetime, :null => true
    end
  end
  
  def self.down
    remove_column :versions, :rbw_start_date
  end
end
