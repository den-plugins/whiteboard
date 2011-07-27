desc 'Generate chart data for all whiteboards'

namespace :rbw do
  task :generate_chart_data => :environment do
    Version.find(:all).each{|v| RbwChartData.generate_data(v.id)}
  end
end
