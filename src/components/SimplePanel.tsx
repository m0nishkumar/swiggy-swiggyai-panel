import React, { useEffect, useState,useCallback } from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, Button, LoadingPlaceholder, Alert, Select, Icon,Checkbox, TimeSeries } from '@grafana/ui';
import { getDataSourceSrv, getBackendSrv,getPanelDataSourceRef,PanelRenderer } from '@grafana/runtime';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { getTemplateSrv } from '@grafana/runtime';

interface Props extends PanelProps<SimpleOptions> {}

const getStyles = (theme: any) => {
  return {
    wrapper: css`
      display: flex;
      flex-direction: column;
      height: 100%;
      background: ${theme.colors.background.primary};
      border-radius: ${theme.shape.borderRadius(2)};
      padding: ${theme.spacing(2)};
    `,
    header: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: ${theme.spacing(2)};
      padding-bottom: ${theme.spacing(2)};
      border-bottom: 1px solid ${theme.colors.border.weak};
    `,
    contentWrapper: css`
      display: flex;
      flex-direction: column;
      height: calc(100% - 60px); // Adjust this value based on your header height
      gap: ${theme.spacing(2)};
    `,
    column: css`
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    `,
    outputText: css`
      flex-grow: 1;
      overflow-y: auto;
      padding: ${theme.spacing(2)};
      background: ${theme.colors.background.secondary};
      border-radius: ${theme.shape.borderRadius()};
      border: 1px solid ${theme.colors.border.weak};
      h3 {
        font-size: ${theme.typography.h5.fontSize};
        margin-bottom: ${theme.spacing(2)};
      }
      ul {
        margin-bottom: ${theme.spacing(2)};
      }
    `,
    row : css `
    display:flex;
    flex-direction:row;
    justify-content:space-between;
    align-items: center;
    `,
    tableWrapper: css`
      flex-grow: 1;
      overflow-y: auto;
      background: ${theme.colors.background.secondary};
      border-radius: ${theme.shape.borderRadius()};
      border: 1px solid ${theme.colors.border.weak};
    `,
    table: css`
      width: 100%;
      border-collapse: collapse;
      th, td {
        padding: ${theme.spacing(1)};
        border: 1px solid ${theme.colors.border.weak};
        text-align: left;
      }
      th {
        background-color: ${theme.colors.background.canvas};
        position: sticky;
        top: 0;
        z-index: 1;
      }
    `,
    options: css`
      display: flex;
      align-items: center;
      gap: ${theme.spacing(2)};
    `,
    loadingWrapper: css`
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    `,
    multiSelect: css`
    position: relative;
    width: 200px;
  `,
  multiSelectHeader: css`
    padding: 8px;
    background-color: ${theme.colors.background.secondary};
    border: 1px solid ${theme.colors.border.weak};
    border-radius: ${theme.shape.borderRadius()};
    cursor: pointer;
  `,
  multiSelectOptions: css`
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 1;
    background-color: ${theme.colors.background.primary};
    border: 1px solid ${theme.colors.border.weak};
    border-top: none;
    border-radius: 0 0 ${theme.shape.borderRadius()} ${theme.shape.borderRadius()};
    max-height: 200px;
    overflow-y: auto;
  `,
  
  multiSelectOption: css`
    padding: 8px;
    cursor: pointer;
    &:hover {
      background-color: ${theme.colors.background.secondary};
    }
  `,
  panelGroup: css`
  margin-bottom: ${theme.spacing(2)};
`,
panelGroupHeader: css`
  font-weight: bold;
  margin-bottom: ${theme.spacing(1)};
  color: ${theme.colors.text.secondary};
`,
  };
};

export const SimplePanel: React.FC<Props> = ({ options,width, height }) => {
  useEffect(() => {


    const date = new Date(1740556244910);
    console.log(date.toLocaleString());
    const fetchDashboardData = async () => {
      try {
        const dashboardUid = window.location.pathname.split('/')[2];
        const response = await getBackendSrv().get('/api/search');
        console.log(response);
        console.log('📌 Dashboard UID:', dashboardUid);

        const dashboard = await getBackendSrv().get(`/api/dashboards/uid/${dashboardUid}`);
        console.log('📌 Dashboard data:', dashboard);

        await iteratePanels(dashboard, false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  const analysisOptions: { [key: string]: string } = {
    Summary: `Analyze the provided JSON data representing metrics from a monitoring dashboard. Provide a comprehensive summary of the key metrics and their current states. Focus on the most critical and relevant data points. Always start with "This data shows..." and give a clear overview of the system's current performance and health based on the metrics provided.`,

    Insights: `Examine the JSON data containing various system metrics. Explain what the data is showing and share detailed insights you can gather from it. Identify and elaborate on any trends, patterns, or anomalies in the metrics. Always begin with "This data indicates..." and provide in-depth insights into the system's behavior, highlighting any notable observations across different metrics.`,
  
    Diagnosis: `Review the JSON data representing system metrics and perform a diagnostic analysis. Identify any potential issues, problems, or inefficiencies indicated by the data. Highlight correlations between different metrics and pinpoint any critical areas of concern. Start your analysis with "Based on this data, the system is experiencing..." and provide a detailed diagnosis of the system's health and performance issues, if any.`,
  
    Comparison: `Analyze the JSON data containing multiple metric sets. Compare the data across different metrics to highlight any correlations, discrepancies, or significant differences. Begin with "Comparing the various metrics, we can observe..." and provide a comparative analysis, explaining how different aspects of the system relate to each other based on the data presented.`,
  
    Forecasting: `Examine the JSON data representing current system metrics. Based on the patterns and trends in this data, provide a forecast of future performance and usage patterns. Start with "Given the current metrics, we can project that..." and offer insights into likely future scenarios. Explain the basis of your forecasts, considering the trends and patterns evident in the provided data.`,
  
    Anomalies: `Scrutinize the JSON data for any anomalies in the system metrics. Analyze each metric carefully and describe in depth any unusual patterns, unexpected spikes, or deviations from normal behavior. Begin your analysis with "Upon examining the metrics, the following anomalies are apparent..." and provide a detailed explanation of each anomaly, its potential causes, and possible implications for system performance.`,
  
    PerformanceOptimization: `Review the JSON data representing system performance metrics. Identify areas where performance could be improved based on the metrics provided. Start with "To optimize system performance based on these metrics, we should focus on..." and provide specific, actionable recommendations for enhancing system efficiency and reliability. Prioritize your suggestions based on the potential impact indicated by the data.`,
  
    ResourceUtilization: `Analyze the JSON data focusing on resource utilization metrics (CPU, memory, disk, network, etc.). Assess the efficiency of resource usage and identify any potential bottlenecks or underutilized resources. Begin with "The resource utilization data indicates..." and provide a detailed analysis of how system resources are being used, highlighting areas of concern and suggesting optimizations where applicable.`,
  
    CapacityPlanning: `Examine the JSON data with a focus on metrics relevant to capacity planning. Based on current usage patterns and growth trends evident in the data, provide insights for future capacity needs. Start with "For effective capacity planning, the data suggests..." and offer recommendations on scaling resources, identifying potential future bottlenecks, and suggesting proactive measures to ensure the system can handle anticipated growth.`,

    FlameGraph: `Analyze this flamegraph from a [service type] application using [language/framework] and provide a detailed performance assessment:

Overview: Summarize the overall performance profile, identifying the most time-consuming functions and their impact on performance.
Hot Path: Describe the main execution path contributing to high CPU usage, explaining the purpose of key functions in this path.
Bottlenecks: Identify the top 3-5 performance bottlenecks, including CPU-intensive operations, I/O bottlenecks, or memory management issues.
Optimization Opportunities: For each major bottleneck, suggest specific optimization strategies, estimating their potential impact and implementation complexity.
Resource Utilization: Assess CPU, memory, and I/O usage patterns visible in the flamegraph, highlighting any inefficiencies or contentions.
Algorithmic Efficiency: Identify any functions that might have suboptimal time complexity (e.g., O(n^2) operations) and suggest improvements.
Concurrency and Scalability: Evaluate the application's use of concurrency and its potential to scale under increased load, based on the flamegraph data.
External Dependencies: Analyze the impact of external libraries or services on performance, recommending optimizations for these interactions.
Anomalies and Root Causes: Highlight any unusual patterns in the flamegraph, providing hypotheses about their root causes and suggesting further investigation methods.
Improvement Roadmap: Based on your analysis, outline a prioritized list of performance improvements, including both quick wins and long-term architectural changes.
Provide your insights in a clear, structured format, using technical details from the flamegraph to support your analysis and recommendations. Consider the broader context of the application's purpose and architecture in your assessment.`,

    TimeSeries: `Generate a comprehensive analysis of the provided time series data. Your analysis should include
Data Overview:
Describe the nature of the data (e.g., stock prices, temperature readings, website traffic)
Identify the time range and frequency of observations
Note any missing or anomalous data points
Descriptive Statistics:
Calculate and interpret key statistics (mean, median, mode, standard deviation, min, max)
Identify any notable outliers or extreme values
Trend Analysis:
Describe the overall trend (increasing, decreasing, stable)
Identify any significant changes or turning points in the trend
Calculate and interpret the rate of change over time
Seasonality and Cyclical Patterns:
Identify any recurring patterns (daily, weekly, monthly, yearly)
Quantify the strength and regularity of these patterns
Discuss potential causes for observed seasonality
Volatility and Stability:
Assess the overall volatility of the data
Identify periods of high and low volatility
Discuss any changes in volatility over time
Correlation Analysis:
If multiple variables are present, analyze their relationships
Calculate and interpret correlation coefficients
Identify any lead-lag relationships between variables
Anomaly Detection:
Identify any unusual spikes, dips, or patterns
Discuss potential causes for these anomalies
Suggest methods for further investigation of anomalies
Forecasting Implications:
Based on the observed patterns, discuss the potential for forecasting
Suggest appropriate forecasting methods given the data characteristics
Highlight any challenges or limitations for accurate forecasting
Data Quality Assessment:
Evaluate the overall quality and reliability of the data
Identify any potential issues with data collection or processing
Suggest improvements for data quality if applicable
Summary and Recommendations:
Summarize the key findings from your analysis
Provide actionable insights based on the data
Suggest areas for further analysis or data collection
Please provide your analysis in a clear, structured format, using appropriate statistical terminology and visualization suggestions where relevant.If you are able to see any spikes give their timing and spike value`
  };


  const modeOfOperation: { [key: string]: string } = {
    FastEffective: '0',
    SlowAccurate: '1'
  }

  const styles = useStyles2(getStyles);
  const [isExpanded, setIsExpanded] = useState(false);
  const [outputText, setOutputText] = useState('Click "Fetch Data" to retrieve data from data sources.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonText, setButtonText] = useState('Analyse');
  const [buttonEnabled, setButtonEnabled] = useState(true);
  const [analysisText, setAnalysisText] = useState('Please choose an analysis option and click Analyse.');
  const [selectedOption, setSelectedOption] = useState<{ label: string; value: string }>({ label: 'Summary', value: 'Summary' });
  const [selectedOptionMode, setSelectedOptionMode] = useState<{ label: string; value: string }>({ label: 'SlowAccurate', value: '1' });
  const [prompt, setPrompt] = useState(analysisOptions.Summary);
  const [data, setData] = useState(null);
  const [profileData, setProfileData] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedAnalysisOptions, setSelectedAnalysisOptions] = useState<string[]>([]);
  const [showPanelsOptions, setShowPanelsOptions] = useState<{ label: string; value: string }[]>([]);
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [templateVars, setTemplateVars] = useState({
    datasource: '',
    job: '',
    node: ''
  });

  // const updateTemplateVars = useCallback(() => {
  //   const templateSrv = getTemplateSrv();
  //   const variables = templateSrv.getVariables();
    
  //   const updatedVars = variables.reduce((acc, variable) => {
  //     const variableName = variable.name;
  //     const variableValue = templateSrv.replace(`\${${variableName}}`);
  //     acc[variableName] = variableValue;
  //     return acc;
  //   }, {});
  
  //   setTemplateVars(updatedVars);
  
  //   console.log('Updated Template Variables:', updatedVars);
  // }, []);

  // useEffect(() => {

  //   updateTemplateVars();

  //   const intervalId = setInterval(() => {
  //     updateTemplateVars();
  //   }, 1000); 

  //   return () => {
  //     clearInterval(intervalId);
  //   };
  // }, [updateTemplateVars]);

  const contentStyle = {
    display: isExpanded ? 'block' : 'none',
  };
  useEffect(() => {
    if (data && data.length > 0) {
      const flamegraphPanels = data.filter(item => Object.keys(item)[0] === 'flamegraph');
      if (flamegraphPanels.length > 0) {
        setSelectedPanel(flamegraphPanels[0]['panel-name']);
      }
    }
  }, [data]);

  function formatDataForLLM(data) {
    return data.map((item, index) => {
      const key = Object.keys(item)[0];
      let value = item[key];
      
      // If the value is a string that looks like JSON, parse it
      if (typeof value === 'string' && value.trim().startsWith('{')) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error('Failed to parse JSON string:', e);
        }
      }
  
      // If value is an object or array, stringify it with indentation
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value, null, 2);
      }
  
      return `Item ${index + 1} (${key}):\n${value}\n`;
    }).join('\n');
  }

  function processProfileData(jsonInput) {
    try {
      console.log("Raw input:", jsonInput);
      const data = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
      console.log("Parsed data:", data);
      
      if (!data || !data.results || !data.results.A || !data.results.A.frames || !data.results.A.frames[0]) {
        console.error("Invalid data structure");
        setProfileData([]);
        return JSON.stringify({ error: 'Invalid data structure' });
      }

      const values = data.results.A.frames[0].data.values;
      const labels = data.results.A.frames[0].schema.fields[3].config.type.enum.text;
      
      const functionData = {};
      
      for (let i = 0; i < values[0].length; i++) {
        const [level, totalTime, selfTime, labelIndex] = values.map(arr => arr[i]);
        const functionName = labels[labelIndex];
        
        if (!functionData[functionName]) {
          functionData[functionName] = { selfTime: 0, totalTime: 0 };
        }
        
        functionData[functionName].selfTime += selfTime;
        functionData[functionName].totalTime = Math.max(functionData[functionName].totalTime, totalTime);
      }
      
      const result = Object.entries(functionData).map(([functionName, data]) => ({
        functionName,
        selfTime: Number((data.selfTime / 60e9).toFixed(4)),
        totalTime: Number((data.totalTime / 60e9).toFixed(4))
      }));
  
      result.sort((a, b) => b.totalTime - a.totalTime);
  
      console.log("Processed profile data:", result);
      // setProfileData(result);
      return JSON.stringify(result, null, 2);
    } catch (error) {
      console.error('Error processing profile data:', error);
      setProfileData([]);
      return JSON.stringify({ error: 'Failed to process profile data' });
    }
  }

  const screenShotMode = async (ress) => {
    try {
      ress.map(item => {
        console.log(item)
        if (item['type'] == 'flamegraph') {
          console.log(item.flamegraph);
          item.flamegraph = processProfileData(item.flamegraph);
        }})
        // ress[0][`${ress[0]["type"]}`] = ress[0][`${ress[0]["type"]}`].slice(0, 500);
      console.log("final-result",ress);
      setData(ress);
      setIsLoading(true);
      setButtonText('Analysing...');
      setButtonEnabled(false);
      
      const payload = {
        model: "bedrock-claude-3-sonnet",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt + "\n\n" + formatDataForLLM(ress) },
            ]
          }
        ],
      };
  
      const response = await axios.post(
        'https://bedrock.llm.in-west.swig.gy/chat/completions',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer sk-kVV4BbEyB4iK-Bb2Ngb7bw`
          }
        }
      );
  
      const responseContent = response.data.choices[0].message.content;
      console.log(responseContent);
      setAnalysisText(responseContent);
    } catch (error) {
      console.error('Error:', error);
      setAnalysisText('An error occurred while processing your request.');
    } finally {
      setButtonText('Analyse');
      setButtonEnabled(true);
      setIsLoading(false);
    }
  };

  const handleOptionChange = (value: any) => {
    setSelectedOption(value);
    setPrompt(analysisOptions[value.value]);
  };

  const handleOptionChangeMode = (value: any) => {
    setSelectedOptionMode(value);
  };

  const sendRequest = async (panel) => {
    setIsLoading(true);
    setError(null);
    // console.log("panel", panel)
    if(!selectedAnalysisOptions.includes(panel.title)){
      return null;
    }
    const now = Date.now();
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    let queries = null;
    // const datasources = await getBackendSrv().get('/api/datasources');
    // const prometheusDs = datasources.find(ds => ds.type === "prometheus");
    // const datasourceUid = prometheusDs?.uid;
    // console.log("Prometheus UID:", datasourceUid);

    const dashboardUid = window.location.pathname.split('/')[2];
    const dashboard = await getBackendSrv().get(`/api/dashboards/uid/${dashboardUid}`);
    // const templating_list= dashboard["dashboard"]["templating"]["list"];
    // let output_list = Array(3).fill(null);
    // for (let index = 0; index < templating_list.length; index++) {
    //   const element = templating_list[index];
    //   if(element.name == "datasource"){
    //     output_list[0] = element.current.value;
    //   }
    //   else if(element.name == "job"){
    //     output_list[1] = element.current.value;
    //   }
    //   else if(element.name == "node"){
    //     output_list[2] = element.current.value;
    //   } 
    // }
    // console.log(panel,panel.datasource.type);
    // console.log(templating_list);
    // console.log(datasourceUid,panel.datasource.uid);
    // console.log('Current template variables:', templateVars);

const processTarget = (target: any) => {
  const templateSrv = getTemplateSrv();

  const replaceVariables = (value: any): any => {
    if (typeof value === 'string') {
      console.log(value,templateSrv.replace(value, null, 'csv'));
      return templateSrv.replace(value, null, 'csv');
    }
    if (typeof value === 'object' && value !== null) {
      const result = Array.isArray(value) ? [] : {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = replaceVariables(val);
      }
      return result;
    }
    return value;
  };

  const replacedTarget = replaceVariables(target);

  // Ensure datasource is handled correctly
  // replacedTarget.datasource = {
  //   ...replacedTarget.datasource,
  //   uid: replacedTarget.datasource.uid === '${datasource}' 
  //     ? templateSrv.replace('${datasource}')
  //     : replacedTarget.datasource.uid
  // };

  return replacedTarget;
};

    // if (panel.datasource.type== "grafana-pyroscope-datasource" ) {
    //   queries = panel.targets.map(target => ({
    //     ...target,
    //     intervalMs: 60000,
    //     maxDataPoints: 360
    //   }));
    // } 
    // else if(panel.datasource.type== "prometheus"){
      queries = panel.targets.map(target => {
        const replacedTarget = processTarget(target);
      
        return {
          ...replacedTarget,
          intervalMs: 60000,
          maxDataPoints: 360
        };
      });
    // }

    const data = {
      queries: queries,
      from: `${twentyFourHoursAgo}`,
      to: `${now}`
    };
    console.log("query",data);
    console.log("grafana api-key",options.GrafanaApiKey);
    const parsedUrl = new URL(window.location.href);
    console.log(`${parsedUrl.protocol}//${parsedUrl.host}/`)
    const config = {
      method: 'post',
      url: `${parsedUrl.protocol}//${parsedUrl.host}/api/ds/query`, 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${options.GrafanaApiKey}`
      },
      data: data
    };
  
    try {
      const response = await axios(config);
      // console.log(JSON.stringify(response.data, null, 2))
      setOutputText(JSON.stringify(response.data, null, 2));
      console.log("response",response.data);
      console.log(JSON.stringify(response.data, null, 2));
      return {[panel.type]:response.data,"panel-name":panel.title,"type":panel.type}
    } catch (error) {
      console.error(error);
      setError('An error occurred while fetching data.');
      return "error";
    } finally {
      setIsLoading(false);
    }
  };

  function convertTimestampsToDates(data: any) {
    const timeValues = data.timeseries.results.A.frames[0].data.values[0];
    const cpuValues = data.timeseries.results.A.frames[0].data.values[1];
    console.log(data);
    return {
            [data["type"]]: timeValues.map((timestamp: number, index: number) => ({
                date: new Date(timestamp).toLocaleString(),
                cpuUsage: cpuValues[index]
            }))
          ,
            "panel-name": data["panel-name"],
            "type":data["type"]
        }
    ;
}

const iteratePanels = async (dashboardObj, value) => {
  if (!dashboardObj || !dashboardObj.dashboard || !dashboardObj.dashboard.panels) {
    console.log("Invalid dashboard object or no panels found.");
    return [];
  }

  const panelResults = [];
  const newShowPanelsOptions = [];

  const processPanel = async (panel) => {
    if (panel.title && panel.type) {
      newShowPanelsOptions.push({
        label: panel.title,
        value: panel.type
      });
    }

    let result = null;
    if (value) {
      result = await sendRequest(panel);
    }
    if (result != null) {
      panelResults.push(result);
    }

    // If it's a row, process its panels
    if (panel.type === 'row') {
      // For collapsed rows
      if (panel.collapsed && Array.isArray(panel.panels)) {
        for (const subPanel of panel.panels) {
          await processPanel(subPanel);
        }
      }
      // For expanded rows
      else if (Array.isArray(panel.panels)) {
        for (const subPanel of panel.panels) {
          await processPanel(subPanel);
        }
      }
    }
  };

  for (const panel of dashboardObj.dashboard.panels) {
    await processPanel(panel);
  }

  setShowPanelsOptions(newShowPanelsOptions);
  return panelResults;
};

  const fetchData = async () => {
    setIsLoading(true);
    setOutputText('');
    setError(null);
    try {
      const dashboardUid = window.location.pathname.split('/')[2];
  
      const dashboard = await getBackendSrv().get(`/api/dashboards/uid/${dashboardUid}`);

      console.log('📌 Dashboard data:', dashboard);
      const result = await iteratePanels(dashboard,true);
      // console.log("result", result);
      
      await screenShotMode(result);
      
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError(`Failed to fetch data: ${err.message}`);
      setOutputText('Failed to retrieve data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = (functionName: string) => {
    console.log(`Optimizing function: ${functionName}`);
  };

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const renderMultiSelect = () => {
    if (!Array.isArray(showPanelsOptions)) return null;

    const groupedPanels = showPanelsOptions.reduce((acc, option) => {
      const key = option.value; 
      if (!key || key === "row" || key === "swiggy-swiggyai-panel") return acc; 
  
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(option);
      return acc;
    }, {});
  
    return (
      <div className={styles.multiSelect}>
        <div className={styles.multiSelectHeader} onClick={toggleDropdown}>
          Select Panels
        </div>
        {isDropdownOpen && (
          <div className={styles.multiSelectOptions}>
            {Object.entries(groupedPanels).map(([panelType, options]) => (
              <div key={panelType} className={styles.panelGroup}>
                <div className={styles.panelGroupHeader}>{panelType}</div>
                {options.map((option) => (
                  <label key={option.label} className={styles.multiSelectOption}>
                    <Checkbox
                      checked={selectedAnalysisOptions.includes(option.label)}
                      onChange={() => handleAnalysisOptionChange(option.label)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  

  const handleAnalysisOptionChange = (option: string) => {
    setSelectedAnalysisOptions(prev => 
      prev.includes(option) 
        ? prev.filter(item => item !== option)
        : [...prev, option]
    );
  };

  useEffect(() => {
    
  }, [selectedAnalysisOptions]);

  const renderTable = () => {
    if (!selectedPanel || data== null) {
      return <Alert title="No panel selected" severity="info">Please select a flamegraph panel to view its data.</Alert>;
    }
  
    const selectedPanelData = data.find(item => item['panel-name'] === selectedPanel);
    
    if (!selectedPanelData) {
      return <Alert title="Panel data not found" severity="error">Unable to find data for the selected panel.</Alert>;
    }
  
    const flamegraphData = selectedPanelData['flamegraph'];
    
    let profileData;
    // console.log(flamegraphData);
    try {
      profileData = JSON.parse(flamegraphData);
    } catch (error) {
      console.error('Error parsing flamegraph data:', error);
      return <Alert title="Data parsing error" severity="error">Unable to parse flamegraph data.</Alert>;
    }
  
    if (!profileData || profileData.length === 0) {
      return <Alert title="No profile data" severity="info">No profile data is available for this panel.</Alert>;
    }
  
    return (
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Function Name</th>
            <th>Self Time (min)</th>
            <th>Total Time (min)</th>
            <th>Optimize</th>
          </tr>
        </thead>
        <tbody>
          {profileData.map((row, index) => (
            <tr key={index}>
              <td>{row.functionName}</td>
              <td>{row.selfTime}</td>
              <td>{row.totalTime}</td>
              <td>
                <Button size="sm" onClick={() => handleOptimize(row.functionName)}>
                  Optimize
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };
  const renderPanelDropdown = () => {
    if(data==null){
      return <></>
    }
    const flamegraphPanels = data.filter(item => Object.keys(item)[0] === 'flamegraph');
  
  
    return (
      <Select
        options={flamegraphPanels.map(panel => ({
          label: panel['panel-name'],
          value: panel['panel-name']
        }))}
        value={selectedPanel}
        onChange={(value) => setSelectedPanel(value.value)}
        placeholder="Select a flamegraph panel"
        width={30}
      />
    );
  };
  
  return (
    <div className={cx(styles.wrapper, css`width: ${width}px; height: ${height}px;`)}>
      <div className={styles.header}>
        <div className={styles.options}>
          {/* <Select
            options={Object.keys(modeOfOperation).map(option => ({ label: option, value: option }))}
            value={selectedOptionMode}
            onChange={handleOptionChangeMode}
            width={20}
            prefix={<Icon name="brain" />}
          /> */}
          <Select
            options={Object.keys(analysisOptions).map(option => ({ label: option, value: option }))}
            value={selectedOption}
            onChange={handleOptionChange}
            width={20}
            prefix={<Icon name="brain" />}
          />
          {renderMultiSelect()}
          <Button onClick={fetchData} disabled={!buttonEnabled || isLoading} icon="play">
            {buttonText}
          </Button>
        </div>
      </div>
      <div className={styles.contentWrapper}>
        {isLoading ? (
          <div className={styles.loadingWrapper}>
            <LoadingPlaceholder text="Analyzing dashboard..." />
          </div>
        ) : (
          <>
            <div className={styles.column}>
            <h5>AI Suggestions:</h5>
              <div className={styles.outputText}>
                {/* <ReactMarkdown>{analysisText}</ReactMarkdown> */}
                <pre>{`${analysisText}`}</pre>
              </div>
            </div>
            <div className={styles.column}>
    <div className={styles.row}>
  <h5>FlameGraph Top Table:</h5>
  {renderPanelDropdown()}
  </div>
  <div className={styles.tableWrapper}>
    {renderTable()}
  </div>
</div>
          </>
        )}
      </div>
    </div>
  );
};