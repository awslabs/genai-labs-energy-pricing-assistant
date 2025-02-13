import { useEffect, useState } from "react";
import { TopNavigation } from "@cloudscape-design/components";
import { Mode } from "@cloudscape-design/global-styles";
import { StorageHelper } from "../common/helpers/storage-helper";
import { APP_NAME } from "../common/constants";
import { fetchAuthSession } from 'aws-amplify/auth';

export interface UserInfo {
  email: string;
  alias: string;
  name: string;
}

export default function GlobalHeader() {
  const [theme, setTheme] = useState<Mode>(StorageHelper.getTheme());
  const [user, setUser] = useState<UserInfo>();

  useEffect(() => {
    fetchAuthSession()
        .then((authSession) => {
            const userSessionPayload: any = authSession.tokens?.idToken?.payload!;
            console.log(authSession.tokens?.idToken?.toString());
            setUser({
                email: userSessionPayload['email'],
                alias: userSessionPayload['identities'][0]['userId'],
                name: userSessionPayload['name'],
            });
          }
        )
      }, []);


  const onChangeThemeClick = () => {
    if (theme === Mode.Dark) {
      setTheme(StorageHelper.applyTheme(Mode.Light));
    } else {
      setTheme(StorageHelper.applyTheme(Mode.Dark));
    }
  };

  // const onItemClickEvent = () => {
  //   signOut()
  // }

  return (
    <div
      style={{ zIndex: 1002, top: 0, left: 0, right: 0, position: "fixed" }}
      id="awsui-top-navigation"
    >
      <TopNavigation
        identity={{
          href: "/",
          logo: { src: "/images/logo_dark.png", alt: `${APP_NAME} Logo` },
        }}
        utilities={[
          {
            type: "button",
            text: theme === Mode.Dark ? '🌙' : '☀️',
            onClick: onChangeThemeClick,
          },
          {
            type: "menu-dropdown",
            text: user?.alias,
            description: user?.name,
            iconName: "user-profile",
            // onItemClick: () => onItemClickEvent(),
            items: [
              {
                id: "email",
                text: user?.email || "",
              },
            ]
          }
        ]}
      />
    </div>
  );
}
