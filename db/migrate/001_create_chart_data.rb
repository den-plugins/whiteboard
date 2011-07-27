class CreateChartData < ActiveRecord::Migration
  def self.up
    create_table :rbw_chart_data do |t|
      t.column :scope, :float, :default => 0, :null => false
      t.column :done, :float, :default => 0, :null => false
      t.column :whiteboard_id, :integer
      
      t.timestamps
    end
    add_index :rbw_chart_data, :whiteboard_id
  end
  
  def self.down
    drop_table :rbw_chart_data
  end
end
