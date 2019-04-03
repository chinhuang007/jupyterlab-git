import { JupyterLab } from "@jupyterlab/application";
import * as React from "react";
import { classes } from "typestyle";
import {
  branchesStyle,
  branchStyle,
  collapseStyle,
  localBranchStyle,
  pastCommitBodyStyle,
  pastCommitExpandedStyle,
  pastCommitHeaderItemStyle,
  pastCommitHeaderStyle,
  pastCommitNodeStyle,
  remoteBranchStyle,
  workingBranchStyle
} from "../componentsStyle/PastCommitNodeStyle";
import { GitBranchResult, SingleCommitInfo, IDiffCallback } from "../git";
import { SinglePastCommitInfo } from "./SinglePastCommitInfo";

export interface IPastCommitNodeProps {
  pastCommit: SingleCommitInfo;
  branches: GitBranchResult["branches"];
  topRepoPath: string;
  app: JupyterLab;
  diff: IDiffCallback;
  refresh: () => void;
}

export interface IPastCommitNodeState {
  expanded: boolean;
}

export class PastCommitNode extends React.Component<
  IPastCommitNodeProps,
  IPastCommitNodeState
> {
  constructor(props: IPastCommitNodeProps) {
    super(props);
    this.state = {
      expanded: false
    };
  }
  getBranchesForCommit() {
    const current_commit = this.props.pastCommit.commit;
    const branches = [];
    for (let i = 0; i < this.props.branches.length; i++) {
      const branch = this.props.branches[i];
      if (branch.top_commit && branch.top_commit == current_commit) {
        branches.push(branch);
      }
    }
    return branches;
  }

  expand() {
    this.setState(() => ({ expanded: true }));
  }

  collapse() {
    this.setState(() => ({ expanded: false }));
  }

  getNodeClass() {
    if (this.state.expanded) {
      return classes(pastCommitNodeStyle, pastCommitExpandedStyle);
    }
    return pastCommitNodeStyle;
  }
  render() {
    return (
      <div
        onClick={() => {
          !this.state.expanded && this.expand();
        }}
        className={this.getNodeClass()}
      >
        <div className={pastCommitHeaderStyle}>
          <div className={pastCommitHeaderItemStyle}>
            {this.props.pastCommit.author}
          </div>
          <div className={pastCommitHeaderItemStyle}>
            {this.props.pastCommit.commit.slice(0, 7)}
          </div>
          <div className={pastCommitHeaderItemStyle}>
            {this.props.pastCommit.date}
          </div>
        </div>
        <div className={branchesStyle}>
          {this.getBranchesForCommit().map((branch, id) => (
            <React.Fragment key={id}>
              {branch.is_current_branch && (
                <span className={classes(branchStyle, workingBranchStyle)}>
                  working
                </span>
              )}
              <span
                className={classes(
                  branchStyle,
                  branch.is_remote_branch ? remoteBranchStyle : localBranchStyle
                )}
              >
                {branch.name}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div className={pastCommitBodyStyle}>
          {this.props.pastCommit.commit_msg}
          {this.state.expanded && (
            <>
              <SinglePastCommitInfo
                data={this.props.pastCommit}
                topRepoPath={this.props.topRepoPath}
                app={this.props.app}
                diff={this.props.diff}
                refresh={this.props.refresh}
              />
              <div className={collapseStyle} onClick={() => this.collapse()}>
                Collapse
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
}
