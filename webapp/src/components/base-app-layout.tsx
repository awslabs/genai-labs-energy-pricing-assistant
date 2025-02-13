import { AppLayout, AppLayoutProps, HelpPanel } from "@cloudscape-design/components";
import { useNavigationPanelState } from "../common/hooks/use-navigation-panel-state";
import NavigationPanel from "./navigation-panel";

export default function BaseAppLayout(props: AppLayoutProps) {
  const [navigationPanelState, setNavigationPanelState] =
    useNavigationPanelState();

    const ToolsContent = () => (
      <HelpPanel
        header={<h2>Sample questions</h2>}
        >
        <ul> 
          <li>What's Amazon's revenue?</li> 
          <li>How does Amazon's revenue compare to Walmart?</li> 
          <li>What are the differences between Target and Walmart's risks?</li> 
          <li>What are the common risks in retails companies?</li>
        </ul>
      </HelpPanel>
    );

  return (
    <AppLayout
      headerSelector="#awsui-top-navigation"
      navigation={<NavigationPanel />}
      navigationOpen={!navigationPanelState.collapsed}
      onNavigationChange={({ detail }) =>
        setNavigationPanelState({ collapsed: !detail.open })
      }
      tools={<ToolsContent />}
      toolsHide={false}
      {...props}
    />
  );
}
