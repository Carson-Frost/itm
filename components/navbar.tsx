"use client"

import * as React from "react"
import Link from "next/link"

import { useIsMobile } from "@/hooks/use-mobile"
import { UserMenu } from "@/components/user-menu"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

export function Navbar() {
  const isMobile = useIsMobile()

  return (
    <nav className="border-b sticky top-0 z-50 bg-background">
      <div className="flex h-14 items-center px-4 sm:px-6 max-w-[1400px] mx-auto">
        <Link href="/" className="mr-2 sm:mr-6 flex items-center space-x-2">
          <span className="font-bold text-lg sm:text-xl">ITM</span>
        </Link>
        <NavigationMenu viewport={isMobile} className="hidden sm:flex">
          <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/connections">Connections</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger onClick={(e) => {
            if (e.currentTarget.getAttribute('data-state') === 'open') {
              e.preventDefault()
            }
          }}>Fantasy</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-2 w-[400px] md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              <ListItem href="/fantasy/rankings" title="Rankings">
                Create and manage your fantasy football rankings.
              </ListItem>
              <ListItem href="/fantasy/rankings/prospects" title="Prospect Rankings">
                Rookie and college prospect rankings for dynasty leagues.
              </ListItem>
              <ListItem href="/fantasy/trade-calculator" title="Trade Calculator">
                Evaluate fantasy football trades with our trade calculator.
              </ListItem>
              <ListItem href="/fantasy/charts" title="Fantasy Charts">
                See the top performing fantasy football players.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger onClick={(e) => {
            if (e.currentTarget.getAttribute('data-state') === 'open') {
              e.preventDefault()
            }
          }}>NFL</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-2 w-[400px] md:w-[500px] md:grid-cols-2 lg:w-[600px]">
              <ListItem href="/nfl/rankings" title="Player Rankings">
                NFL player rankings and performance evaluations.
              </ListItem>
              <ListItem href="/nfl/rankings/draft-classes" title="Draft Classes">
                Historical and current NFL draft class analysis.
              </ListItem>
              <ListItem href="/nfl/rankings/teams" title="Team Rankings">
                NFL team rankings and organizational evaluations.
              </ListItem>
              <ListItem href="/nfl/stats" title="Stats">
                Comprehensive NFL player and team statistics.
              </ListItem>
              <ListItem href="/nfl/itm-model" title="ITM Model">
                Advanced analytics and projections from the ITM Model.
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
        <NavigationMenu viewport={isMobile} className="ml-auto -mr-1 sm:-mr-2">
          <NavigationMenuList>
            <UserMenu />
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </nav>
  )
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string; title: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link href={href}>
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
